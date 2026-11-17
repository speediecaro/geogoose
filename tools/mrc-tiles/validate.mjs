import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';

export async function validate(directory) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  if (!manifest.complete) throw new Error('Tile build is incomplete.');
  const ids = { qc_addresses: new Set(), qc_buildings: new Set() };
  if (!Array.isArray(manifest.tileKeys)) throw new Error('Missing tile inventory.');
  const remaining = new Set(manifest.tileKeys);
  if (!remaining.size || remaining.size !== manifest.tileKeys.length) throw new Error('Missing or duplicate tile inventory.');
  const { readdir } = await import('node:fs/promises');
  let bytes = 0, maximum = 0;
  const counts = {};
  for (let z = 12; z <= 15; z++) {
    const zoomPath = path.join(directory, String(z));
    for (const xName of await readdir(zoomPath)) {
      if (!/^\d+$/.test(xName)) throw new Error('Unexpected tile directory.');
      for (const yName of await readdir(path.join(zoomPath, xName))) {
        if (!/^\d+\.pbf$/.test(yName)) throw new Error('Unexpected tile filename.');
        const x = Number(xName), y = Number(yName.slice(0, -4));
        if (!remaining.delete(`${z}/${x}/${y}`)) throw new Error('Tile absent from manifest inventory.');
        const buffer = await readFile(path.join(zoomPath, xName, yName));
        const tile = new VectorTile(new Pbf(buffer));
        bytes += buffer.length; maximum = Math.max(maximum, buffer.length);
        counts[z] = (counts[z] || 0) + 1;
        for (const [name, layer] of Object.entries(tile.layers)) {
          if (!ids[name] || layer.version !== 2 || layer.extent !== 4096) throw new Error('Unexpected layer/version/extent.');
          if (name === 'qc_addresses' && z < 14) throw new Error('Addresses below their declared zoom.');
          for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i);
            if (!feature.loadGeometry().length) throw new Error(`Empty decoded geometry: ${name}/${feature.id}`);
            if (z === 15) ids[name].add(feature.id);
            const geometry = feature.toGeoJSON(x, y, z).geometry;
            function check(coordinates) {
              if (typeof coordinates[0] === 'number') {
                if (!coordinates.every(Number.isFinite) || Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 85.1) {
                  throw new Error('Invalid decoded coordinate.');
                }
              } else for (const part of coordinates) check(part);
            }
            check(geometry.coordinates);
          }
        }
      }
    }
    if (counts[z] !== manifest.tileCounts[z]) throw new Error(`Tile count mismatch at z${z}`);
  }
  if (remaining.size || bytes !== manifest.totalBytes || maximum !== manifest.maxTileBytes ||
      ids.qc_buildings.size !== manifest.uniqueBuildings || ids.qc_addresses.size !== manifest.uniqueAddresses) {
    throw new Error('Decoded feature coverage or tile byte counts do not match the manifest.');
  }
  return { valid: true, tiles: counts, bytes, maxTileBytes: maximum,
    buildings: ids.qc_buildings.size, addresses: ids.qc_addresses.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node validate.mjs TILE_DIRECTORY');
  console.log(JSON.stringify(await validate(path.resolve(process.argv[2])), null, 2));
}
