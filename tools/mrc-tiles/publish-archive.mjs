import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { PMTiles } from 'pmtiles';
import { mergeTiles } from './merge.mjs';
import { validate } from './validate.mjs';

if (process.argv.length !== 4) throw new Error('Usage: node publish-archive.mjs VERIFIED_TILES NEW_OUTPUT_DIRECTORY');
const input = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
await validate(input);
const manifest = JSON.parse(await readFile(path.join(input, 'manifest.json'), 'utf8'));
await mkdir(output, { recursive: false });
const database = new DatabaseSync(path.join(output, 'regional.mbtiles'));
database.exec(`CREATE TABLE metadata (name TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB,
  PRIMARY KEY (zoom_level,tile_column,tile_row));`);
const insert = database.prepare('INSERT INTO tiles VALUES (?, ?, ?, ?)');
const putMetadata = database.prepare('INSERT INTO metadata VALUES (?, ?)');
for (const [key, value] of Object.entries({
  name: `GeoGoose Quebec ${manifest.mrcCode}`,
  description: 'World-map tiles supplemented with Quebec open address and building references.',
  format: 'pbf', type: 'baselayer', version: '1', minzoom: '12', maxzoom: '15',
  attribution: '© OpenStreetMap contributors; © Gouvernement du Québec — CC BY 4.0',
  json: JSON.stringify({ vector_layers: [
    { id: 'qc_buildings', fields: { quality: 'String', sourceDate: 'String', version: 'String' }, minzoom: 12, maxzoom: 15 },
    { id: 'qc_addresses', fields: { number: 'String', quality: 'String', version: 'String' }, minzoom: 14, maxzoom: 15 }
  ] })
})) putMetadata.run(key, value);
const archive = new PMTiles('https://world-maps.geogoose.app/file/geogoose-maps-world/20261115.pmtiles');
const header = await archive.getHeader();
if (header.maxZoom !== 15 || header.tileType !== 1) throw new Error('Unexpected base archive.');
async function getBase(z, x, y) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try { return await archive.getZxy(z, x, y, AbortSignal.timeout(60000)); }
    catch (error) {
      const transient = /Bad response code: (429|5\d\d)/.test(error.message) ||
        error.name === 'TimeoutError' || (error instanceof TypeError && /fetch failed/i.test(error.message));
      if (!transient || attempt === 4) throw error;
      console.warn(`Base tile ${z}/${x}/${y}: attempt ${attempt} failed (${error.message}); retrying.`);
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}
let next = 0, completed = 0, bytes = 0;
const stats = { removedBuildings: 0, removedAddresses: 0 };
database.exec('BEGIN');
try {
  let failed = false;
  const results = await Promise.allSettled(Array.from({ length: 4 }, async () => {
    try {
      while (!failed && next < manifest.tileKeys.length) {
        const key = manifest.tileKeys[next++];
        const [z, x, y] = key.split('/').map(Number);
        const official = await readFile(path.join(input, String(z), String(x), `${y}.pbf`));
        const base = await getBase(z, x, y);
        const result = mergeTiles(base ? new Uint8Array(base.data) : null, official, z, x, y);
        const compressed = gzipSync(result.bytes);
        insert.run(z, x, 2 ** z - 1 - y, compressed);
        bytes += compressed.length;
        stats.removedBuildings += result.stats.removedBuildings;
        stats.removedAddresses += result.stats.removedAddresses;
        completed++;
        if (completed % 250 === 0) console.log(`${completed}/${manifest.tileKeys.length} tiles; ${bytes} gzip bytes`);
      }
    } catch (error) {
      failed = true;
      throw error;
    }
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  database.exec('COMMIT');
} catch (error) {
  database.exec('ROLLBACK');
  throw error;
} finally {
  database.close();
}
await writeFile(path.join(output, 'build.json'), JSON.stringify({
  complete: true, source: manifest.source, tileCount: completed, gzipBytes: bytes,
  stats, baseArchive: '20261115.pmtiles', createdUtc: new Date().toISOString()
}));
console.log(`Complete: ${completed} tiles; ${bytes} gzip bytes.`);
