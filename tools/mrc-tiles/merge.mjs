import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import vtpbf from 'vt-pbf';
import area from '@turf/area';
import intersect from '@turf/intersect';
import RBush from 'rbush';

function decode(bytes) {
  return bytes?.length ? new VectorTile(new Pbf(bytes)) : { layers: {} };
}

function box(geometry) {
  const result = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  function visit(c) {
    if (typeof c[0] === 'number') {
      result.minX = Math.min(result.minX, c[0]); result.maxX = Math.max(result.maxX, c[0]);
      result.minY = Math.min(result.minY, c[1]); result.maxY = Math.max(result.maxY, c[1]);
    } else for (const child of c) visit(child);
  }
  visit(geometry.coordinates);
  return result;
}

function distance(a, b) {
  const radians = Math.PI / 180;
  const dx = (a[0] - b[0]) * Math.cos((a[1] + b[1]) * radians / 2);
  return Math.hypot(dx, a[1] - b[1]) * 111195;
}

const numberKey = value => String(value ?? '').normalize('NFKC').toUpperCase().replace(/\s+/g, '');

function tileFeature(feature, extent) {
  const rings = feature.loadGeometry().map(ring => ring.map(p => [p.x * 4096 / extent, p.y * 4096 / extent]));
  return {
    id: feature.id, type: feature.type, tags: feature.properties,
    geometry: feature.type === 1 ? rings.flat() : rings
  };
}

export function mergeTiles(baseBytes, officialBytes, z, x, y) {
  const base = decode(baseBytes);
  const official = decode(officialBytes);
  const officialBuildings = new RBush();
  const officialAddresses = new RBush();
  const stats = { removedBuildings: 0, removedAddresses: 0 };
  for (const name of ['qc_buildings', 'qc_addresses']) {
    const layer = official.layers[name];
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i).toGeoJSON(x, y, z);
      const entry = { ...box(feature.geometry), feature };
      if (name === 'qc_buildings') officialBuildings.insert(entry);
      else officialAddresses.insert(entry);
    }
  }
  const layers = {};
  for (const [name, layer] of Object.entries(base.layers)) {
    const features = [];
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i);
      let duplicate = false;
      if (name === 'buildings' && ['building', 'building_part', 'address'].includes(f.properties.kind)) {
        const feature = f.toGeoJSON(x, y, z);
        const bounds = box(feature.geometry);
        if (f.properties.kind === 'address' && feature.geometry.type === 'Point') {
          const point = feature.geometry.coordinates;
          const dy = 20 / 111195;
          const dx = dy / Math.cos(point[1] * Math.PI / 180);
          const candidates = officialAddresses.search({
            minX: point[0] - dx, maxX: point[0] + dx, minY: point[1] - dy, maxY: point[1] + dy
          });
          const key = numberKey(f.properties.addr_housenumber);
          duplicate = !!key && candidates.some(c => numberKey(c.feature.properties.number) === key &&
            distance(point, c.feature.geometry.coordinates) <= 20);
          if (duplicate) stats.removedAddresses++;
        } else if (['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
          duplicate = officialBuildings.search(bounds).some(c => {
            const overlap = intersect({ type: 'FeatureCollection', features: [feature, c.feature] });
            if (!overlap) return false;
            const smaller = Math.min(area(feature), area(c.feature));
            return smaller > 0 && area(overlap) / smaller >= 0.35;
          });
          if (duplicate) stats.removedBuildings++;
        }
      }
      if (!duplicate) features.push(tileFeature(f, layer.extent));
    }
    layers[name] = { features, extent: 4096 };
  }
  for (const [name, layer] of Object.entries(official.layers)) {
    if (!['qc_buildings', 'qc_addresses'].includes(name)) throw new Error(`Unexpected official tile layer: ${name}`);
    layers[name] = {
      features: Array.from({ length: layer.length }, (_, i) => {
        const f = layer.feature(i);
        return tileFeature(f, layer.extent);
      }),
      extent: 4096
    };
  }
  return { bytes: vtpbf.fromGeojsonVt(layers, { version: 2 }), stats };
}
