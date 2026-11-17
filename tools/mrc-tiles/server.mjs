import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PMTiles } from 'pmtiles';
import { mergeTiles } from './merge.mjs';

const directory = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Usage: node server.mjs COMPLETE_TILE_DIRECTORY');
const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
if (!manifest.complete || manifest.maxzoom !== 15) throw new Error('Incomplete or unsupported tile export.');
if (!Array.isArray(manifest.tileKeys) || !manifest.tileKeys.length) throw new Error('Missing official tile inventory.');
const officialKeys = new Set(manifest.tileKeys);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const archiveUrl = 'https://world-maps.geogoose.app/file/geogoose-maps-world/20261115.pmtiles';
const archive = new PMTiles(archiveUrl);
const header = await archive.getHeader();
if (header.maxZoom !== 15 || header.tileType !== 1) throw new Error('Unexpected world archive type or zoom.');
const tileCache = new Map();
const stats = { requests: 0, removedBuildings: 0, removedAddresses: 0, errors: 0 };
const staticFiles = new Map([
  ['/', ['tests\\mrc-preview.html', 'text/html; charset=utf-8']],
  ['/mrc-preview.js', ['tests\\mrc-preview.js', 'text/javascript; charset=utf-8']],
  ['/world-map-style.js', ['world-map-style.js', 'text/javascript; charset=utf-8']]
]);
const csp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://unpkg.com; " +
  "style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://protomaps.github.io; " +
  "connect-src 'self' https://protomaps.github.io https://unpkg.com; worker-src blob:; base-uri 'none'; form-action 'none'";

async function tile(z, x, y, enabled) {
  const key = `${z}/${x}/${y}/${enabled}`;
  if (tileCache.has(key)) {
    const value = tileCache.get(key);
    tileCache.delete(key); tileCache.set(key, value);
    return value;
  }
  const base = await archive.getZxy(z, x, y, AbortSignal.timeout(30000));
  const baseBytes = base ? new Uint8Array(base.data) : null;
  const official = enabled && officialKeys.has(`${z}/${x}/${y}`) ?
    await readFile(path.join(directory, String(z), String(x), `${y}.pbf`)) : null;
  let bytes = baseBytes || new Uint8Array();
  if (official) {
    const result = mergeTiles(baseBytes, official, z, x, y);
    bytes = result.bytes;
    stats.removedBuildings += result.stats.removedBuildings;
    stats.removedAddresses += result.stats.removedAddresses;
  }
  tileCache.set(key, bytes);
  while (tileCache.size > 128) tileCache.delete(tileCache.keys().next().value);
  return bytes;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.headers.host !== '127.0.0.1:18767') { res.writeHead(403); res.end('Local host required.'); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, 'http://127.0.0.1:18767');
    let bytes, type;
    if (staticFiles.has(url.pathname)) {
      const [filename, mime] = staticFiles.get(url.pathname);
      bytes = await readFile(path.join(root, filename)); type = mime;
    } else if (url.pathname === '/manifest.json') {
      const { tileKeys, ...summary } = manifest;
      bytes = JSON.stringify({ ...summary, archiveUrl }); type = 'application/json';
    } else if (url.pathname === '/boundary.geojson') {
      bytes = await readFile(path.join(directory, 'boundary.geojson')); type = 'application/geo+json';
    } else if (url.pathname === '/health') {
      bytes = JSON.stringify({ ready: true, mrc: manifest.mrcCode, stats, cachedTiles: tileCache.size }); type = 'application/json';
    } else {
      const match = /^\/tiles\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url.pathname);
      if (!match) { res.writeHead(404); res.end('Not found'); return; }
      const [z, x, y] = match.slice(1).map(Number);
      if (z > 15 || x >= 2 ** z || y >= 2 ** z) { res.writeHead(400); res.end('Invalid tile'); return; }
      stats.requests++;
      bytes = await tile(z, x, y, url.searchParams.get('official') !== '0');
      type = 'application/x-protobuf';
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    stats.errors++;
    console.error('MRC preview request failed:', req.url, error);
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Preview data unavailable. See the local server error log.');
  }
});
server.listen(18767, '127.0.0.1', () => console.log('MRC preview ready: http://127.0.0.1:18767/'));
