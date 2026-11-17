import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';

export async function build(input, output) {
  const manifest = JSON.parse(await readFile(path.join(input, 'manifest.json'), 'utf8'));
  if (!manifest.complete || manifest.schemaVersion !== 1) throw new Error('Incomplete or unsupported source export.');
  const allowed = new Set(manifest.files.map(f => f.file));
  for (const file of manifest.files) {
    if (path.basename(file.file) !== file.file) throw new Error('Unsafe manifest filename.');
    const bytes = await readFile(path.join(input, file.file));
    if (bytes.length !== file.bytes ||
        createHash('sha256').update(bytes).digest('hex') !== file.sha256.toLowerCase()) {
      throw new Error(`Source checksum mismatch: ${file.file}`);
    }
  }
  async function load(name) {
    if (!allowed.has(name)) throw new Error(`Unverified source file: ${name}`);
    return JSON.parse(await readFile(path.join(input, name), 'utf8'));
  }
  const addresses = await load(manifest.addresses.file);
  const buildings = { type: 'FeatureCollection', features: [] };
  for (const file of manifest.buildings.files) buildings.features.push(...(await load(file)).features);
  if (addresses.features.length !== manifest.addresses.points || buildings.features.length !== manifest.buildings.count) {
    throw new Error('Source feature count mismatch.');
  }
  addresses.features.forEach((f, i) => { f.id = i + 1; });
  const datasets = { qc_buildings: buildings, qc_addresses: addresses };
  const indexes = {};
  for (const [name, data] of Object.entries(datasets)) {
    indexes[name] = geojsonvt(data, { maxZoom: 15, indexMaxZoom: 5, extent: 4096, buffer: 128, tolerance: 0 });
  }
  await mkdir(output, { recursive: false });
  const counts = {};
  const tileKeys = [];
  const seen = { qc_buildings: new Set(), qc_addresses: new Set() };
  let totalBytes = 0;
  let maxTileBytes = 0;
  async function visit(z, x, y) {
    const layers = {};
    for (const [name, index] of Object.entries(indexes)) {
      const tile = index.getTile(z, x, y);
      if (tile?.features.length) layers[name] = tile;
    }
    if (!Object.keys(layers).length) return;
    if (z >= 12) {
      if (z < 14) delete layers.qc_addresses;
      if (Object.keys(layers).length) {
        const bytes = vtpbf.fromGeojsonVt(layers, { version: 2 });
        const directory = path.join(output, String(z), String(x));
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, `${y}.pbf`), bytes);
        tileKeys.push(`${z}/${x}/${y}`);
        totalBytes += bytes.length;
        maxTileBytes = Math.max(maxTileBytes, bytes.length);
        counts[z] = (counts[z] || 0) + 1;
        if (z === 15) {
          for (const [name, tile] of Object.entries(layers)) {
            for (const f of tile.features) seen[name].add(f.id);
          }
        }
      }
    }
    if (z < 15) {
      for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) {
        await visit(z + 1, x * 2 + dx, y * 2 + dy);
      }
    }
  }
  await visit(0, 0, 0);
  if (seen.qc_buildings.size !== manifest.buildings.count || seen.qc_addresses.size !== manifest.addresses.points) {
    throw new Error('Tiling lost source features; no completion manifest written.');
  }
  await writeFile(path.join(output, 'boundary.geojson'), JSON.stringify(await load('boundary.geojson')));
  const result = {
    complete: true, mrcCode: manifest.mrcCode, mrcName: manifest.mrcName,
    source: manifest, minzoom: 12, maxzoom: 15, tileCounts: counts,
    uniqueBuildings: seen.qc_buildings.size, uniqueAddresses: seen.qc_addresses.size,
    totalBytes, maxTileBytes, tileKeys, builtUtc: new Date().toISOString()
  };
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(result));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) throw new Error('Usage: node build.mjs VERIFIED_EXPORT NEW_TILE_DIRECTORY');
  console.log(JSON.stringify(await build(path.resolve(process.argv[2]), path.resolve(process.argv[3])),
    (k, v) => ['source', 'tileKeys'].includes(k) ? undefined : v, 2));
}
