import { open, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';

if (process.argv.length !== 4) throw new Error('Usage: node validate-archive.mjs VERIFIED_TILES ARCHIVE.pmtiles');
const directory = path.resolve(process.argv[2]);
const filename = path.resolve(process.argv[3]);
const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
if (!manifest.complete || !manifest.tileKeys?.length) throw new Error('Missing complete tile inventory.');
const file = await open(filename, 'r');
try {
  const archive = new PMTiles({
    getKey: () => filename,
    getBytes: async (offset, length) => {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await file.read(buffer, 0, length, offset);
      if (bytesRead !== length) throw new Error('Truncated PMTiles archive.');
      return { data: buffer.buffer };
    }
  });
  const header = await archive.getHeader();
  assert.equal(header.numAddressedTiles, manifest.tileKeys.length);
  assert.equal(header.minZoom, 12);
  assert.equal(header.maxZoom, 15);
  const ids = { qc_buildings: new Set(), qc_addresses: new Set() };
  let largest = 0;
  for (const key of manifest.tileKeys) {
    const [z, x, y] = key.split('/').map(Number);
    const tile = await archive.getZxy(z, x, y);
    assert.ok(tile, `Missing archive tile ${key}`);
    largest = Math.max(largest, tile.data.byteLength);
    const merged = new VectorTile(new Pbf(new Uint8Array(tile.data)));
    const original = new VectorTile(new Pbf(await readFile(path.join(directory, String(z), String(x), `${y}.pbf`))));
    for (const name of Object.keys(ids)) {
      const expected = original.layers[name];
      const actual = merged.layers[name];
      assert.equal(actual?.length || 0, expected?.length || 0, `${key}/${name} count`);
      if (!expected) continue;
      assert.equal(actual.version, 2);
      assert.equal(actual.extent, 4096);
      for (let i = 0; i < expected.length; i++) {
        const a = actual.feature(i), b = expected.feature(i);
        assert.equal(a.id, b.id);
        assert.deepEqual(a.properties, b.properties);
        assert.deepEqual(a.loadGeometry(), b.loadGeometry());
        if (z === 15) ids[name].add(a.id);
      }
    }
  }
  assert.equal(ids.qc_buildings.size, manifest.uniqueBuildings);
  assert.equal(ids.qc_addresses.size, manifest.uniqueAddresses);
  assert.equal(await archive.getZxy(5, 10, 12), undefined);
  console.log(JSON.stringify({ valid: true, tiles: manifest.tileKeys.length, buildings: ids.qc_buildings.size,
    addresses: ids.qc_addresses.size, largestDecodedTile: largest }));
} finally {
  await file.close();
}
