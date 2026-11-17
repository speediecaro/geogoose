import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, readFile, rm, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { mergeTiles } from './merge.mjs';
import { build } from './build.mjs';
import { validate } from './validate.mjs';

const z = 15, x = 9500, y = 11500;
function position(px, py) {
  const longitude = (x + px / 4096) / 2 ** z * 360 - 180;
  const n = Math.PI * (1 - 2 * (y + py / 4096) / 2 ** z);
  return [longitude, Math.atan(Math.sinh(n)) * 180 / Math.PI];
}
function polygon(a, b, c, d, id, properties = {}) {
  return { type: 'Feature', id, properties,
    geometry: { type: 'Polygon', coordinates: [[position(a, b), position(c, b),
      position(c, d), position(a, d), position(a, b)]] } };
}
function point(px, py, id, properties) {
  return { type: 'Feature', id, properties, geometry: { type: 'Point', coordinates: position(px, py) } };
}
function encode(layers) {
  const tiles = {};
  for (const [name, features] of Object.entries(layers)) {
    const tile = geojsonvt({ type: 'FeatureCollection', features }, { maxZoom: 15, tolerance: 0 }).getTile(z, x, y);
    if (tile) tiles[name] = tile;
  }
  return vtpbf.fromGeojsonVt(tiles, { version: 2 });
}
function decode(bytes) { return new VectorTile(new Pbf(bytes)); }
function ids(layer) { return Array.from({ length: layer.length }, (_, i) => layer.feature(i).id); }

test('merge prefers overlapping official buildings but preserves touching, distant and small-overlap OSM footprints', () => {
  const base = encode({ buildings: [
    polygon(100, 100, 200, 200, 1, { kind: 'building' }),
    polygon(200, 100, 300, 200, 2, { kind: 'building' }),
    polygon(1000, 1000, 1100, 1100, 3, { kind: 'building' }),
    polygon(195, 100, 295, 200, 4, { kind: 'building' }),
    polygon(120, 120, 160, 160, 5, { kind: 'building_part' })
  ], pois: [point(500, 500, 6, { kind: 'shop', name: 'Preserved shop' })] });
  const official = encode({ qc_buildings: [polygon(100, 100, 200, 200, 7)] });
  const merged = mergeTiles(base, official, z, x, y);
  assert.equal(decode(merged.bytes).layers.buildings.version, 2);
  assert.deepEqual(ids(decode(merged.bytes).layers.buildings), [2, 3, 4]);
  assert.deepEqual(ids(decode(merged.bytes).layers.pois), [6]);
  assert.deepEqual(decode(merged.bytes).layers.pois.feature(0).toGeoJSON(x, y, z).geometry,
    decode(base).layers.pois.feature(0).toGeoJSON(x, y, z).geometry);
  assert.deepEqual(ids(decode(merged.bytes).layers.qc_buildings), [7]);
  assert.equal(merged.stats.removedBuildings, 2);
});

test('addresses require an equal normalized number and <=20 m; remote conflicting positions stay visible', () => {
  const base = encode({ buildings: [
    point(100, 100, 1, { kind: 'address', addr_housenumber: '42 a' }),
    point(100, 100, 2, { kind: 'address', addr_housenumber: '44' }),
    point(2000, 2000, 3, { kind: 'address', addr_housenumber: '42A' }),
    point(100, 100, 4, { kind: 'address' })
  ] });
  const official = encode({ qc_addresses: [point(110, 110, 5, { number: '42A' })] });
  const merged = mergeTiles(base, official, z, x, y);
  assert.deepEqual(ids(decode(merged.bytes).layers.buildings), [2, 3, 4]);
  assert.deepEqual(decode(merged.bytes).layers.qc_addresses.feature(0).toGeoJSON(x, y, z).geometry,
    decode(official).layers.qc_addresses.feature(0).toGeoJSON(x, y, z).geometry);
  assert.equal(merged.stats.removedAddresses, 1);
});

test('empty official coverage preserves OSM geometries and attributes', () => {
  const base = encode({ buildings: [polygon(100, 100, 200, 200, 1, { kind: 'building', name: 'Kept' })] });
  const merged = decode(mergeTiles(base, null, z, x, y).bytes);
  assert.equal(merged.layers.buildings.feature(0).properties.name, 'Kept');
  assert.deepEqual(ids(merged.layers.buildings), [1]);
});

test('source export compiles all IDs; verifies hashes and refuses overwrite', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'geogoose-tiles-'));
  try {
    const addresses = { type: 'FeatureCollection', features: [point(100, 100, 1, { number: '42' })] };
    const buildings = { type: 'FeatureCollection', features: [polygon(90, 90, 200, 200, 10)] };
    const boundary = { type: 'FeatureCollection', features: [polygon(0, 0, 4096, 4096, 1)] };
    const files = [];
    for (const [name, content] of Object.entries({ 'addresses.geojson': addresses, 'buildings.geojson': buildings, 'boundary.geojson': boundary })) {
      const bytes = Buffer.from(JSON.stringify(content));
      await writeFile(path.join(root, name), bytes);
      files.push({ file: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    const manifest = { complete: true, schemaVersion: 1, mrcCode: '79', mrcName: 'Test',
      addresses: { file: 'addresses.geojson', points: 1 }, buildings: { files: ['buildings.geojson'], count: 1 }, files };
    await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
    const result = await build(root, path.join(root, 'tiles'));
    assert.equal(result.uniqueAddresses, 1);
    assert.equal(result.uniqueBuildings, 1);
    assert.ok(result.maxTileBytes < 250000);
    assert.equal((await validate(path.join(root, 'tiles'))).valid, true);
    const maxTile = decode(await readFile(path.join(root, 'tiles', String(z), String(x), `${y}.pbf`)));
    assert.equal(maxTile.layers.qc_addresses.feature(0).properties.number, '42');
    await assert.rejects(build(root, path.join(root, 'tiles')), /EEXIST/);
    await unlink(path.join(root, 'tiles', String(z), String(x), `${y}.pbf`));
    await assert.rejects(validate(path.join(root, 'tiles')), /mismatch|coverage/);
    await writeFile(path.join(root, 'addresses.geojson'), '{}');
    await assert.rejects(build(root, path.join(root, 'corrupt')), /checksum/);
  } finally { await rm(root, { recursive: true }); }
});
