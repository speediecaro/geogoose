'use strict';

(async function () {
  var frame = document.getElementById('map');
  var result = document.getElementById('result');
  var trace = 'g321IvkhhOoGoGoGoGoGvMoGoGoGoGoGvMoGoGoGoGoGvM';
  var checks = 0;
  var navigation = 0;
  frame.style.width = '360px';
  frame.style.height = '640px';
  function layout() {
    return new Promise(function (resolve) { setTimeout(resolve, 80); });
  }
  function check(condition, description) {
    if (!condition) throw new Error(description);
    checks++;
  }
  function load(language, suffix, legacyFragmentLanguage) {
    return new Promise(function (resolve, reject) {
      var id = String(++navigation);
      var attempts = 0;
      frame.src = '../t/?' + (legacyFragmentLanguage ? '' : 'lang=' + language + '&') +
        'test=' + id + (suffix || '') + '#p=' + trace +
        (legacyFragmentLanguage ? '&lang=' + language : '');
      var timer = setInterval(function () {
        var doc = frame.contentDocument;
        if (doc && new URL(frame.contentWindow.location.href).searchParams.get('test') === id &&
            doc.querySelector('.leaflet-overlay-pane path')) {
          clearInterval(timer);
          resolve();
        } else if (++attempts > 100) {
          clearInterval(timer);
          reject(new Error('Map initialization timed out'));
        }
      }, 50);
    });
  }
  function encodedTrace(points) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    var output = '';
    var previous = [0, 0];
    points.forEach(function (point) {
      point.forEach(function (coordinate, axis) {
        var current = Math.round(coordinate * 100000);
        var delta = current - previous[axis];
        previous[axis] = current;
        var value = delta < 0 ? ~(delta << 1) : delta << 1;
        while (value >= 32) {
          output += alphabet[(value & 31) | 32];
          value >>>= 5;
        }
        output += alphabet[value];
      });
    });
    return output;
  }
  try {
    for (var language of ['fr', 'en', 'it', 'es', 'de', 'pt', 'hi', 'ar', 'id', 'vi', 'zz']) {
      await load(language);
      var doc = frame.contentDocument;
      var win = frame.contentWindow;
      check(doc.documentElement.lang === (language === 'zz' ? 'en' : language), 'Language fallback');
      check(doc.getElementById('tagline').textContent.includes('HONK'), 'HONK preserved');
      var googleOptions = doc.getElementById('google-options');
      var mapElement = doc.getElementById('map');
      var expandButton = doc.getElementById('expand-map');
      check(!googleOptions.open && !googleOptions.hidden, 'Google links collapsed by default');
      check(doc.getElementById('google').checkVisibility(), 'Last-position link stays visible');
      check(mapElement.getBoundingClientRect().height >= 350, 'Map occupies most of mobile viewport initially');
      check(doc.documentElement.scrollWidth <= win.innerWidth, 'No horizontal mobile overflow');
      check(expandButton.textContent.length > 0, 'Localized expand control');
      var legend = doc.getElementById('map-legend');
      check(!legend.hidden && !legend.open, 'Legend available and collapsed by default');
      check(doc.getElementById('legend-summary').textContent.length > 0, 'Localized legend title');
      check(doc.querySelectorAll('#route-legend li').length === 4, 'Legend explains every GPS symbol');
      check(doc.getElementById('basemap-legend').hidden, 'World palette hidden on OSM fallback');
      doc.getElementById('legend-summary').click();
      await layout();
      check(legend.open && doc.getElementById('legend-note').checkVisibility(), 'Legend opens with data coverage note');
      check(doc.documentElement.scrollWidth <= win.innerWidth, 'Open legend has no horizontal overflow');
      check(mapElement.getBoundingClientRect().height >= 350, 'Open legend does not shrink map');
      doc.getElementById('legend-summary').click();
      doc.getElementById('google-summary').click();
      await layout();
      check(googleOptions.open && doc.getElementById('google').checkVisibility(), 'Google links expand');
      check(doc.querySelector('.google-content').getBoundingClientRect().height <= win.innerHeight * 0.35 + 15,
        'Expanded links have a bounded scroll area');
      var links = Array.from(doc.querySelectorAll('#google-routes a'));
      check(links.length === 3, 'Three route parts');
      for (var mode of ['driving', 'walking']) {
        doc.getElementById('travel-mode').value = mode;
        doc.getElementById('travel-mode').dispatchEvent(new win.Event('change'));
        var rebuilt = [];
        links.forEach(function (link, index) {
          var params = new URL(link.href).searchParams;
          check(params.get('travelmode') === mode, 'Travel mode');
          check(params.get('api') === '1', 'Google Maps URL API');
          var waypoints = params.has('waypoints') ? params.get('waypoints').split('|') : [];
          check(waypoints.length <= 3, 'Mobile waypoint limit');
          var segment = [params.get('origin')].concat(waypoints, [params.get('destination')]);
          rebuilt = rebuilt.concat(index ? segment.slice(1) : segment);
        });
        check(rebuilt.length === 10, 'All ten points retained');
        rebuilt.forEach(function (point, index) {
          var coords = point.split(',').map(Number);
          check(Math.abs(coords[0] - (45.5 + index * 0.001)) < 0.000001, 'Latitude order');
          check(Math.abs(coords[1] - (-73.57 + (index % 3) * 0.001)) < 0.000001, 'Longitude order');
        });
      }
      check(win.getComputedStyle(doc.documentElement).getPropertyValue('--brand-primary').trim() === '#0067c5', 'Blue default');
      check(doc.getElementById('palette') === null, 'No palette selector');
      var colors = Array.from(doc.querySelectorAll('.leaflet-overlay-pane path')).map(function (path) {
        return path.getAttribute('stroke');
      });
      check(colors.includes('#0067c5'), 'Blue route color');
      var originalHeight = mapElement.getBoundingClientRect().height;
      var originalTransform = doc.querySelector('.leaflet-map-pane').style.transform;
      expandButton.click();
      await layout();
      check(expandButton.getAttribute('aria-expanded') === 'true', 'Expanded accessible state');
      check(mapElement.getBoundingClientRect().height > originalHeight, 'Expand increases map height');
      check(Math.abs(doc.getElementById('map-view').getBoundingClientRect().height - win.innerHeight) < 1,
        'Expanded map fills viewport');
      check(googleOptions.inert, 'Background controls unavailable while expanded');
      doc.getElementById('legend-summary').click();
      await layout();
      check(legend.checkVisibility() && !legend.inert, 'Legend accessible in expanded map');
      doc.getElementById('legend-summary').click();
      check(doc.querySelector('.leaflet-container').clientHeight === mapElement.clientHeight, 'Map container resized');
      expandButton.click();
      await layout();
      check(expandButton.getAttribute('aria-expanded') === 'false' && !googleOptions.inert, 'Reduce restores controls');
      check(mapElement.getBoundingClientRect().height === originalHeight, 'Reduce restores map height');
      check(doc.querySelector('.leaflet-map-pane').style.transform === originalTransform, 'Expansion preserves map position');
      expandButton.click();
      doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
      check(expandButton.getAttribute('aria-expanded') === 'false', 'Escape exits expanded view');
      doc.getElementById('google-summary').click();
      await layout();
      check(!googleOptions.open && doc.getElementById('travel-mode').value === 'walking', 'Collapsing preserves travel mode');
    }
    // Build 28 includes both coordinates and the locale in the fragment.
    for (var legacyLanguage of ['fr', 'en', 'fr-CA']) {
      await load(legacyLanguage, '', true);
      var legacyDoc = frame.contentDocument;
      check(legacyDoc.documentElement.lang === legacyLanguage.split('-')[0], 'Build 28 fragment locale');
      check(legacyDoc.getElementById('info').textContent === '10 points', 'Build 28 decoded positions');
      check(legacyDoc.querySelectorAll('.leaflet-overlay-pane path').length === 11, 'Build 28 full GPS trace');
      check(legacyDoc.querySelectorAll('#google-routes a').length === 3, 'Build 28 Google route links');
      check(legacyDoc.getElementById('google').href.includes('45.50900,-73.57000'), 'Build 28 final position');
    }
    await load('fr', '&palette=classic');
    check(frame.contentWindow.getComputedStyle(frame.contentDocument.documentElement)
      .getPropertyValue('--brand-primary').trim() === '#0067c5', 'Legacy palette URL remains blue');
    for (var pointCount of [10, 40]) {
      var expected = Array.from({ length: pointCount }, function (_, i) {
        return [Number((45.5 + i * 0.001).toFixed(5)), Number((-73.57 + (i % 3) * 0.001).toFixed(5))];
      });
      trace = encodedTrace(expected);
      await load('fr');
      var maxDoc = frame.contentDocument;
      check(maxDoc.getElementById('info').textContent === pointCount + ' points', 'Maximum decoded point count');
      var paths = maxDoc.querySelectorAll('.leaflet-overlay-pane path');
      check(paths.length === pointCount + 1, 'One polyline and every position rendered');
      var directions = Array.from(maxDoc.querySelectorAll('#google-routes a'));
      check(directions.length === Math.ceil((pointCount - 1) / 4), 'Maximum route part count');
      check(!maxDoc.getElementById('google-options').open, 'Many route links stay collapsed on load');
      check(maxDoc.getElementById('map').getBoundingClientRect().height >= 350, 'Many links do not shrink initial map');
      for (var travelMode of ['driving', 'walking']) {
        maxDoc.getElementById('travel-mode').value = travelMode;
        maxDoc.getElementById('travel-mode').dispatchEvent(new frame.contentWindow.Event('change'));
        var all = [];
        directions.forEach(function (link, index) {
          var query = new URL(link.href).searchParams;
          check(query.get('travelmode') === travelMode, 'Maximum travel mode');
          var middle = query.has('waypoints') ? query.get('waypoints').split('|') : [];
          check(middle.length <= 3, 'Maximum mobile waypoint limit');
          var part = [query.get('origin')].concat(middle, [query.get('destination')]);
          all = all.concat(index ? part.slice(1) : part);
        });
        check(JSON.stringify(all.map(function (point) { return point.split(',').map(Number); })) === JSON.stringify(expected),
          'Every decoded maximum position preserved in exact order');
      }
    }
    for (var viewport of [[360, 640], [640, 360], [1280, 800]]) {
      frame.style.width = viewport[0] + 'px';
      frame.style.height = viewport[1] + 'px';
      trace = encodedTrace([[45.5, -73.57]]);
      await load('fr');
      var singleDoc = frame.contentDocument;
      check(singleDoc.getElementById('google-options').hidden, 'Single point has no empty route disclosure');
      check(singleDoc.querySelectorAll('#route-legend li').length === 1 &&
        singleDoc.querySelector('#route-legend .legend-last'), 'Single-point legend only shows last-position marker');
      check(singleDoc.getElementById('google').checkVisibility(), 'Single point keeps Google position link visible');
      check(singleDoc.documentElement.scrollWidth <= viewport[0], 'No horizontal overflow across viewports');
      singleDoc.getElementById('expand-map').click();
      await layout();
      check(Math.abs(singleDoc.getElementById('map-view').getBoundingClientRect().height - viewport[1]) < 1,
        'Single-point map fills mobile, landscape and desktop viewports');
      singleDoc.getElementById('expand-map').click();
      await layout();
      check(!singleDoc.body.classList.contains('map-expanded'), 'Single-point map restores normal layout');
    }
    var paletteWin = frame.contentWindow;
    var paletteDoc = frame.contentDocument;
    var cloudEvents;
    var osmRestored = false;
    var cloudRemoved = false;
    paletteWin.maplibregl = {
      setRTLTextPlugin: function () { return Promise.resolve(); },
      addProtocol: function () {},
      Map: function () {
        cloudEvents = {};
        this.on = function (name, callback) { cloudEvents[name] = callback; };
        this.remove = function () { cloudRemoved = true; };
      }
    };
    paletteWin.pmtiles = {
      Protocol: function () { this.add = function () {}; },
      PMTiles: function () {}
    };
    paletteWin.basemaps = {
      namedFlavor: function () { return {}; },
      layers: function () {
        return ['boundaries', 'landuse_park', 'landuse_urban_green', 'water_stream',
          'water_river', 'landuse_pedestrian', 'water', 'landuse_runway', 'roads_rail',
          'roads_tunnels_other_casing', 'roads_major', 'roads_bridges_major',
          'buildings', 'address_label'].map(function (id) {
          return {
            id: id,
            layout: id === 'address_label' ? { 'text-field': ['get', 'addr_housenumber'] } : {},
            paint: { 'fill-color': '#c8e8bc' }
          };
        });
      }
    };
    var addressStyle = paletteWin.geoGooseMapStyle.createLayers('fr').find(function (layer) {
      return layer.id === 'address_label';
    });
    check(addressStyle.minzoom === 14, 'Address labels start one zoom level earlier');
    check(addressStyle.layout['text-font'][0] === 'Noto Sans Regular', 'Address labels use upright text');
    check(addressStyle.paint['text-color'] === '#514b47' && addressStyle.paint['text-halo-width'] === 1.5,
      'Address labels have darker text and a stronger halo');
    check(addressStyle.layout['text-variable-anchor'].length === 5 &&
      !addressStyle.layout['text-allow-overlap'], 'Address placement avoids collisions without forcing overlap');
    check(JSON.stringify(addressStyle.layout['text-field']) === '["get","addr_housenumber"]',
      'Address labels preserve source house numbers');
    paletteWin.geoGooseMapStyle = {
      createLayers: function () { return []; },
      addDetails: function () {}
    };
    var mockMap = {
      getContainer: function () { return paletteDoc.getElementById('map'); },
      getCenter: function () { return { lat: 45.5, lng: -73.57 }; },
      getZoom: function () { return 16; },
      hasLayer: function () { return false; },
      on: function () {},
      attributionControl: { addAttribution: function () {}, removeAttribution: function () {} }
    };
    paletteWin.geoGooseWorldMap.attach(mockMap, paletteWin.L, {
      addTo: function () { osmRestored = true; }
    }, 'fr', 'Carte indisponible.');
    await layout();
    check(!paletteDoc.getElementById('basemap-legend').hidden, 'World palette shown with world map');
    check(paletteDoc.querySelectorAll('#basemap-legend li').length === 23, 'World legend explains main map layers and services');
    check(paletteDoc.querySelector('.legend-parking').textContent === 'P' &&
      paletteDoc.querySelector('.legend-toilets svg') &&
      paletteDoc.querySelector('.legend-forest svg') &&
      paletteDoc.querySelector('.legend-wetland svg'), 'Legend includes service symbols and land-cover motifs');
    cloudEvents.idle();
    paletteDoc.getElementById('map-fallback').click();
    check(paletteDoc.getElementById('basemap-legend').hidden && osmRestored && cloudRemoved,
      'Fallback removes world palette and restores OSM');
    check(!paletteDoc.getElementById('map-legend').hidden, 'GPS legend remains available after fallback');
    result.textContent = 'PASS: ' + checks + ' checks';
  } catch (error) {
    result.textContent = 'FAIL: ' + error.message;
  }
})();
