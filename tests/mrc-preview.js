'use strict';

(async function () {
  var status = document.getElementById('status');
  try {
    async function json(url) {
      var response = await fetch(url);
      if (!response.ok) throw new Error(url + ' : HTTP ' + response.status);
      return response.json();
    }
    var manifest = await json('/manifest.json');
    var boundary = await json('/boundary.geojson');
    var bounds = new maplibregl.LngLatBounds();
    function extend(coordinates) {
      if (typeof coordinates[0] === 'number') bounds.extend(coordinates);
      else coordinates.forEach(extend);
    }
    boundary.features.forEach(function (feature) { extend(feature.geometry.coordinates); });
    document.getElementById('title').textContent = manifest.mrcName + ' — aperçu complet en tuiles';
    if (manifest.mrcCode !== '79') {
      document.querySelectorAll('[data-place]:not([data-place="all"])').forEach(function (button) {
        button.hidden = true;
      });
    }
    document.getElementById('inventory').textContent =
      manifest.uniqueAddresses.toLocaleString('fr-CA') + ' points d’adresse et ' +
      manifest.uniqueBuildings.toLocaleString('fr-CA') + ' bâtiments. Versions des adresses : ' +
      manifest.source.addresses.versions.join(', ') + '; bâtiments : ' +
      Object.keys(manifest.source.buildings.versions).join(', ') + '.';
    var map = new maplibregl.Map({
      container: 'map', bounds: bounds, fitBoundsOptions: { padding: 24 },
      maxZoom: 20,
      style: {
        version: 8,
        glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
        sources: {
          'geo-map': {
            type: 'vector', tiles: [location.origin + '/tiles/{z}/{x}/{y}.pbf?official=1'],
            minzoom: 0, maxzoom: 15,
            attribution: '© OpenStreetMap contributors | © Gouvernement du Québec — CC BY 4.0'
          }
        },
        layers: geoGooseMapStyle.createLayers('fr')
      }
    });
    window.mrcPreview = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    var failed = false;
    map.on('error', function (event) {
      failed = true;
      console.error('Aperçu MRC indisponible.', event.error);
      status.textContent = 'Erreur de chargement : ' + event.error.message + ' Rechargez la page pour réessayer.';
    });
    map.on('idle', function () {
      if (!failed) status.textContent = 'Carte chargée — fond mondial réel; Québec ' +
        (document.getElementById('official').checked ? 'activé.' : 'désactivé.');
    });
    geoGooseMapStyle.addDetails(map, 'fr', function (error) {
      map.fire('error', { error: error });
    });
    map.on('load', function () {
      map.addSource('mrc-boundary', { type: 'geojson', data: boundary });
      map.addLayer({
        id: 'mrc-boundary', type: 'line', source: 'mrc-boundary',
        paint: { 'line-color': '#622e91', 'line-width': 1.5, 'line-dasharray': [3, 3] }
      });
      map.on('click', function (event) {
        var features = map.queryRenderedFeatures(event.point, { layers: ['qc-addresses', 'qc-buildings'] });
        if (!features.length) return;
        var feature = features[0];
        var p = feature.properties;
        var content = document.createElement('div');
        var heading = document.createElement('strong');
        heading.textContent = feature.layer.id === 'qc-addresses' ?
          p.number + ' ' + p.street + ', ' + p.municipality : 'Bâtiment — Gouvernement du Québec';
        content.appendChild(heading);
        [feature.layer.id === 'qc-addresses' ? 'Source : RQA' : 'Source : Référentiel québécois sur les bâtiments',
          'Version : ' + p.version, 'Qualité : ' + p.quality,
          p.sourceDate ? 'Photographie source : ' + p.sourceDate : 'Modification : ' + p.modified
        ].forEach(function (line) {
          var paragraph = document.createElement('p');
          paragraph.textContent = line;
          content.appendChild(paragraph);
        });
        new maplibregl.Popup().setLngLat(event.lngLat).setDOMContent(content).addTo(map);
      });
      document.getElementById('official').addEventListener('change', function (event) {
        status.textContent = 'Chargement de la comparaison…';
        map.getSource('geo-map').setTiles([
          location.origin + '/tiles/{z}/{x}/{y}.pbf?official=' + (event.target.checked ? '1' : '0')
        ]);
      });
    });
    var places = {
      laurier: [-75.499, 46.550, 15],
      rouge: [-74.867, 46.408, 15],
      laus: [-75.621, 46.084, 15]
    };
    document.querySelectorAll('[data-place]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.dataset.place === 'all') map.fitBounds(bounds, { padding: 24, duration: 0 });
        else {
          var p = places[button.dataset.place];
          map.jumpTo({ center: p.slice(0, 2), zoom: p[2] });
        }
      });
    });
  } catch (error) {
    console.error('Impossible de préparer l’aperçu MRC.', error);
    status.textContent = 'Erreur : ' + error.message;
  }
}());
