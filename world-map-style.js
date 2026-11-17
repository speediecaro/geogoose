'use strict';

window.geoGooseMapStyle = (function () {
  function createLayers(language) {
    var compare = true;
    var flavor = basemaps.namedFlavor('light');
    if (compare) {
      Object.assign(flavor, {
        background: '#f2efe9', earth: '#f2efe9', water: '#aad3df',
        park_a: '#c8e8bc', park_b: '#b5dfa5', wood_a: '#c8e8bc', wood_b: '#aed1a0',
        hospital: '#fde0df', school: '#f0e8d9', industrial: '#e8e0e8',
        buildings: '#d9d0c9', major: '#f9d99b', highway: '#e9a6a6',
        bridges_major: '#f9d99b', bridges_highway: '#e9a6a6',
        roads_label_minor: '#625c58', roads_label_major: '#5d5149'
      });
    }
    var layers = basemaps.layers('geo-map', flavor, { lang: language });
    if (compare) {
      var boundaryLayer = layers.find(function (layer) { return layer.id === 'boundaries'; });
      if (!boundaryLayer) throw new Error('La couche des limites administratives est introuvable.');
      boundaryLayer.paint['line-color'] = '#8b7392';
      boundaryLayer.paint['line-width'] = [
        'interpolate', ['linear'], ['zoom'], 5, 0.8, 8, 1.2, 12, 1.5
      ];
      boundaryLayer.paint['line-dasharray'] = [3, 2];
      var parkIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_park'; });
      if (parkIndex === -1) throw new Error('La couche des parcs du style est introuvable.');
      var parkLayer = layers[parkIndex];
      parkLayer.paint['fill-color'] = [
        'case', ['==', ['get', 'kind'], 'sand'], '#eddda8', parkLayer.paint['fill-color']
      ];
      layers.splice(parkIndex, 0, {
        id: 'experimental-sand',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'sand'],
        paint: { 'fill-color': '#eddda8' }
      });
      parkIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_park'; });
      layers.splice(parkIndex, 0, {
        id: 'experimental-urban-landuse',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['in', ['get', 'kind'], ['literal', ['residential', 'commercial']]],
        paint: {
          'fill-color': ['match', ['get', 'kind'], 'commercial', '#e7d3cb', '#e2d9d4']
        }
      });
      parkIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_park'; });
      layers.splice(parkIndex, 0, {
        id: 'experimental-farmland',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'farmland'],
        paint: { 'fill-color': '#eef0d5' }
      });
      parkIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_park'; });
      layers.splice(parkIndex, 0, {
        id: 'experimental-meadow',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'meadow'],
        paint: { 'fill-color': '#cde9bd' }
      });
      parkIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_park'; });
      layers.splice(parkIndex, 0, {
        id: 'experimental-garden',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'garden'],
        paint: { 'fill-color': '#bee3b4' }
      });
      parkIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_park'; });
      layers.splice(parkIndex + 1, 0, {
        id: 'experimental-wood',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['in', ['get', 'kind'], ['literal', ['wood', 'forest']]],
        paint: {
          'fill-color': flavor.wood_b,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 11, 1]
        }
      });
      var urbanGreenIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_urban_green'; });
      if (urbanGreenIndex === -1) throw new Error('La couche des espaces verts urbains est introuvable.');
      layers.splice(urbanGreenIndex + 1, 0, {
        id: 'experimental-allotments',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'allotments'],
        paint: { 'fill-color': '#d7d4b5', 'fill-outline-color': '#a5a381' }
      });
      urbanGreenIndex = layers.findIndex(function (layer) { return layer.id === 'experimental-allotments'; });
      layers.splice(urbanGreenIndex + 1, 0, {
        id: 'experimental-dog-park',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'dog_park'],
        paint: { 'fill-color': '#c4dfae', 'fill-outline-color': '#80a26b' }
      });
      var streamLayer = layers.find(function (layer) { return layer.id === 'water_stream'; });
      var riverLayer = layers.find(function (layer) { return layer.id === 'water_river'; });
      if (!streamLayer || !riverLayer) throw new Error('Les couches de cours d’eau du style sont introuvables.');
      var aboveGround = ['>=', ['coalesce', ['get', 'layer'], 0], 0];
      streamLayer.filter = ['all', ['==', ['get', 'kind'], 'stream'], aboveGround];
      riverLayer.filter = ['all', ['==', ['get', 'kind'], 'river'], aboveGround];
      streamLayer.minzoom = 12;
      streamLayer.paint['line-color'] = flavor.water;
      streamLayer.paint['line-width'] = [
        'interpolate', ['linear'], ['zoom'], 12, 1.2, 14, 1.8, 16, 2.5, 19, 5
      ];
      riverLayer.paint['line-color'] = flavor.water;
      riverLayer.paint['line-width'] = [
        'interpolate', ['linear'], ['zoom'], 9, 1.2, 12, 2.2, 15, 3.5, 18, 12, 19, 15
      ];
      var pedestrianIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_pedestrian'; });
      if (pedestrianIndex === -1) throw new Error('La couche piétonne du style est introuvable.');
      layers.splice(pedestrianIndex, 0, {
        id: 'experimental-lower-waterway',
        type: 'line',
        source: 'geo-map',
        'source-layer': 'water',
        minzoom: 12,
        filter: ['all',
          ['in', ['get', 'kind'], ['literal', ['stream', 'river']]],
          ['<', ['coalesce', ['get', 'layer'], 0], 0]
        ],
        paint: {
          'line-color': flavor.water,
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 2.5, 19, 5],
          'line-dasharray': [2, 2]
        }
      });
      var waterIndex = layers.findIndex(function (layer) { return layer.id === 'water'; });
      if (waterIndex === -1) throw new Error('La couche d’eau du style est introuvable.');
      layers.splice(waterIndex, 0, {
        id: 'experimental-cemetery',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'cemetery'],
        paint: { 'fill-color': '#aacbaf' }
      });
      waterIndex = layers.findIndex(function (layer) { return layer.id === 'water'; });
      layers.splice(waterIndex, 0, {
        id: 'experimental-pitch',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'pitch'],
        paint: { 'fill-color': '#8ed7b8', 'fill-outline-color': '#60ad91' }
      });
      waterIndex = layers.findIndex(function (layer) { return layer.id === 'water'; });
      layers.splice(waterIndex, 0, {
        id: 'experimental-wetland',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'wetland'],
        paint: { 'fill-color': '#87c5b2', 'fill-opacity': 0.85, 'fill-outline-color': '#639e92' }
      });
      var runwayIndex = layers.findIndex(function (layer) { return layer.id === 'landuse_runway'; });
      if (runwayIndex === -1) throw new Error('La couche des pistes d’aéroport est introuvable.');
      layers.splice(runwayIndex, 0, {
        id: 'experimental-grass',
        type: 'fill',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'grass'],
        paint: { 'fill-color': '#cde9bd' }
      });
      var railIndex = layers.findIndex(function (layer) { return layer.id === 'roads_rail'; });
      if (railIndex === -1) throw new Error('La couche ferroviaire du style est introuvable.');
      layers.splice(railIndex + 1, 0, {
        id: 'experimental-subway',
        type: 'line',
        source: 'geo-map',
        'source-layer': 'roads',
        minzoom: 15,
        filter: ['all', ['==', ['get', 'kind'], 'rail'], ['==', ['get', 'kind_detail'], 'subway']],
        paint: {
          'line-color': '#8574a2',
          'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1.5, 18, 3],
          'line-opacity': 0.8,
          'line-dasharray': [2, 2]
        }
      });
      var roadIndex = layers.findIndex(function (layer) { return layer.id === 'roads_tunnels_other_casing'; });
      if (roadIndex === -1) throw new Error('La couche des routes du style est introuvable.');
      layers.splice(roadIndex, 0, {
        id: 'experimental-park-outline',
        type: 'line',
        source: 'geo-map',
        'source-layer': 'landuse',
        filter: ['in', ['get', 'kind'], ['literal', ['national_park', 'park', 'protected_area', 'nature_reserve']]],
        minzoom: 8,
        paint: { 'line-color': '#53905e', 'line-width': 1.5, 'line-opacity': 0.8, 'line-dasharray': [3, 2] }
      });
      ['roads_major', 'roads_bridges_major'].forEach(function (id) {
        var road = layers.find(function (layer) { return layer.id === id; });
        if (!road) throw new Error('La couche routière ' + id + ' est introuvable.');
        road.paint['line-color'] = ['match', ['get', 'kind_detail'],
          ['trunk', 'trunk_link', 'primary', 'primary_link'], '#e9877b',
          ['secondary', 'secondary_link'], '#f2bb72',
          ['tertiary', 'tertiary_link'], '#f9d99b', flavor.major];
        road.paint['line-width'] = [
          'interpolate', ['exponential', 1.6], ['zoom'], 6, 0.4, 9, 1.5, 12, 2, 15, 3, 18, 13
        ];
      });
      var labelIndex = layers.findIndex(function (layer) { return layer.id === 'address_label'; });
      if (labelIndex === -1) throw new Error('La couche des étiquettes du style est introuvable.');
      layers[labelIndex].minzoom = 15;
      var buildingIndex = layers.findIndex(function (layer) { return layer.id === 'buildings'; });
      if (buildingIndex === -1) throw new Error('La couche des bâtiments du style est introuvable.');
      layers.splice(buildingIndex + 1, 0, {
        id: 'experimental-building-outline',
        type: 'line',
        source: 'geo-map',
        'source-layer': 'buildings',
        minzoom: 15,
        filter: ['in', ['get', 'kind'], ['literal', ['building', 'building_part']]],
        paint: { 'line-color': '#b3a49b', 'line-width': 0.7, 'line-opacity': 0.85 }
      });
      labelIndex = layers.findIndex(function (layer) { return layer.id === 'address_label'; });
      layers.splice(labelIndex, 0, {
        id: 'experimental-trails',
        type: 'line',
        source: 'geo-map',
        'source-layer': 'roads',
        minzoom: 12,
        filter: ['all',
          ['==', ['get', 'kind'], 'path'],
          ['in', ['get', 'kind_detail'], ['literal', ['path', 'footway', 'steps', 'bridleway']]],
          ['!', ['has', 'is_tunnel']]
        ],
        paint: {
          'line-color': '#bd665c',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.2, 15, 1.8, 18, 2.8],
          'line-dasharray': [2, 1.5]
        }
      });
      labelIndex = layers.findIndex(function (layer) { return layer.id === 'address_label'; });
      layers.splice(labelIndex, 0, {
        id: 'experimental-cycleways',
        type: 'line',
        source: 'geo-map',
        'source-layer': 'roads',
        minzoom: 12,
        filter: ['all',
          ['==', ['get', 'kind'], 'path'],
          ['==', ['get', 'kind_detail'], 'cycleway'],
          ['!', ['has', 'is_tunnel']]
        ],
        paint: {
          'line-color': '#4b84b5',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.2, 15, 1.8, 18, 2.8],
          'line-dasharray': [2, 1.5]
        }
      });
      labelIndex = layers.findIndex(function (layer) { return layer.id === 'address_label'; });
      layers.splice(labelIndex, 0, {
        id: 'experimental-tracks',
        type: 'line',
        source: 'geo-map',
        'source-layer': 'roads',
        minzoom: 12,
        filter: ['all',
          ['==', ['get', 'kind'], 'path'],
          ['==', ['get', 'kind_detail'], 'track'],
          ['!', ['has', 'is_tunnel']]
        ],
        paint: {
          'line-color': '#806c56',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 1.5, 18, 2.5],
          'line-dasharray': [3, 1.5, 0.5, 1.5]
        }
      });
    }
    return layers;
  }

  function addDetails(map, language, onError) {
    var compare = true;
    if (compare) {
      map.once('load', function () {
        try {
          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = 32;
          var context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Impossible de créer le symbole de camping.');
          context.fillStyle = '#fff';
          context.fillRect(1, 1, 30, 30);
          context.strokeStyle = '#277344';
          context.lineWidth = 2;
          context.strokeRect(1, 1, 30, 30);
          context.beginPath();
          context.moveTo(5, 25);
          context.lineTo(16, 7);
          context.lineTo(27, 25);
          context.closePath();
          context.stroke();
          context.beginPath();
          context.moveTo(12, 25);
          context.lineTo(16, 17);
          context.lineTo(20, 25);
          context.stroke();
          map.addImage('experimental-camp', context.getImageData(0, 0, 32, 32), { pixelRatio: 2 });
          canvas.width = canvas.height = 64;
          function addPairedPattern(name, color, width, draw) {
            context.clearRect(0, 0, 64, 64);
            context.strokeStyle = color;
            context.lineWidth = width;
            [[16, 16, 0], [48, 48, Math.PI]].forEach(function (position) {
              context.save();
              context.translate(position[0], position[1]);
              context.rotate(position[2]);
              context.beginPath();
              draw(context);
              context.stroke();
              context.restore();
            });
            map.addImage('experimental-' + name + '-pattern', context.getImageData(0, 0, 64, 64));
          }
          addPairedPattern('forest', '#569768', 1.5, function (ctx) {
            ctx.moveTo(-5, 3); ctx.lineTo(0, -7); ctx.lineTo(5, 3); ctx.closePath();
            ctx.moveTo(0, 3); ctx.lineTo(0, 7);
          });
          addPairedPattern('wetland', '#3179a0', 1.8, function (ctx) {
            ctx.moveTo(7, -8); ctx.lineTo(15, -8);
            ctx.moveTo(12, 0); ctx.lineTo(20, 0);
            ctx.moveTo(7, 8); ctx.lineTo(15, 8);
          });
          addPairedPattern('cemetery', '#638b70', 2, function (ctx) {
            ctx.moveTo(-4, 5); ctx.lineTo(-4, -1); ctx.arc(0, -1, 4, Math.PI, 0);
            ctx.lineTo(4, 5); ctx.moveTo(-6, 6); ctx.lineTo(6, 6);
          });
          addPairedPattern('garden', '#789b68', 1.4, function (ctx) {
            ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
            ctx.moveTo(0, -5); ctx.lineTo(0, 5);
            ctx.moveTo(-3, -3); ctx.lineTo(3, 3);
            ctx.moveTo(-3, 3); ctx.lineTo(3, -3);
          });
          [['forest', ['wood', 'forest']], ['wetland', ['wetland']],
            ['cemetery', ['cemetery']], ['garden', ['garden']]].forEach(function (item) {
            map.addLayer({
              id: 'experimental-' + item[0] + '-pattern',
              type: 'fill',
              source: 'geo-map',
              'source-layer': 'landuse',
              minzoom: 12,
              filter: ['in', ['get', 'kind'], ['literal', item[1]]],
              paint: {
                'fill-pattern': 'experimental-' + item[0] + '-pattern',
                'fill-opacity': item[0] === 'wetland' ? 0.8 : 0.6
              }
            }, 'water');
          });
          var poiLayer = map.getStyle().layers.find(function (layer) { return layer.id === 'pois'; });
          if (!poiLayer) throw new Error('La couche des points d’intérêt est introuvable.');
          var socialFacilityLayout = Object.assign({}, poiLayer.layout, {
            'text-offset': [0, 0],
            'text-variable-anchor': ['center', 'left', 'right', 'top', 'bottom'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 18, 14]
          });
          delete socialFacilityLayout['icon-image'];
          map.addLayer({
            id: 'geogoose-social-facility-labels',
            type: 'symbol',
            source: 'geo-map',
            'source-layer': 'pois',
            minzoom: 14,
            filter: ['all',
              ['==', ['get', 'kind'], 'social_facility'],
              ['any', ['has', 'name'], ['has', 'pgf:name']]
            ],
            layout: socialFacilityLayout,
            paint: { 'text-color': '#70565c', 'text-halo-color': '#fff', 'text-halo-width': 1.5 }
          }, 'pois');
          function addPoiIcon(name, draw) {
            canvas.width = canvas.height = 32;
            context.fillStyle = '#fff';
            context.strokeStyle = '#66717f';
            context.lineWidth = 2;
            context.fillRect(1, 1, 30, 30);
            context.strokeRect(1, 1, 30, 30);
            context.fillStyle = '#526177';
            draw(context);
            map.addImage(name, context.getImageData(0, 0, 32, 32), { pixelRatio: 2 });
          }
          addPoiIcon('experimental-parking', function (ctx) {
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('P', 16, 17);
          });
          addPoiIcon('experimental-toilets', function (ctx) {
            ctx.beginPath();
            ctx.arc(10, 7, 2.4, 0, Math.PI * 2);
            ctx.moveTo(24.4, 7);
            ctx.arc(22, 7, 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(7, 11, 6, 8);
            ctx.fillRect(8, 19, 2, 6);
            ctx.fillRect(11, 19, 2, 6);
            ctx.beginPath();
            ctx.moveTo(20, 11); ctx.lineTo(24, 11);
            ctx.lineTo(27, 20); ctx.lineTo(17, 20);
            ctx.closePath(); ctx.fill();
            ctx.fillRect(19, 20, 2, 5);
            ctx.fillRect(23, 20, 2, 5);
          });
          map.setLayoutProperty('pois', 'icon-image', ['case',
            ['==', ['get', 'kind'], 'toilets'], 'experimental-toilets',
            poiLayer.layout['icon-image']
          ]);
          addPoiIcon('experimental-shopping', function (ctx) {
            ctx.strokeRect(8, 12, 16, 13);
            ctx.beginPath();
            ctx.arc(16, 12, 4, Math.PI, 0);
            ctx.stroke();
          });
          addPoiIcon('experimental-pharmacy', function (ctx) {
            ctx.fillStyle = '#278253';
            ctx.fillRect(13, 6, 6, 20);
            ctx.fillRect(6, 13, 20, 6);
          });
          addPoiIcon('experimental-bank', function (ctx) {
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('B', 16, 17);
          });
          addPoiIcon('experimental-church', function (ctx) {
            ctx.fillRect(14, 6, 4, 20);
            ctx.fillRect(9, 11, 14, 4);
          });
          addPoiIcon('experimental-worship', function (ctx) {
            ctx.beginPath();
            ctx.moveTo(16, 6); ctx.lineTo(25, 16); ctx.lineTo(16, 26); ctx.lineTo(7, 16);
            ctx.closePath(); ctx.stroke();
          });
          addPoiIcon('experimental-subway-entrance', function (ctx) {
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('M', 16, 17);
          });
          map.addLayer({
            id: 'experimental-subway-entrances',
            type: 'symbol',
            source: 'geo-map',
            'source-layer': 'pois',
            filter: ['all', ['==', ['get', 'kind'], 'subway_entrance'],
              ['>=', ['zoom'], ['get', 'min_zoom']]],
            layout: { 'icon-image': 'experimental-subway-entrance' }
          }, 'pois');
          map.addLayer({
            id: 'experimental-urban-pois',
            type: 'symbol',
            source: 'geo-map',
            'source-layer': 'pois',
            filter: ['all',
              ['in', ['get', 'kind'], ['literal', [
                'parking', 'retail', 'mall', 'jewelry', 'place_of_worship',
                'bakery', 'bank', 'boutique', 'car_parts', 'copyshop', 'department_store',
                'dressmaker', 'hairdresser', 'hardware', 'interior_decoration', 'kiosk',
                'laundry', 'mobile_phone', 'motorcycle', 'optician', 'pharmacy', 'sewing',
                'travel_agency', 'variety_store'
              ]]],
              ['any', ['==', ['get', 'kind'], 'parking'], ['has', 'name'], ['has', 'pgf:name']],
              ['>=', ['zoom'], ['get', 'min_zoom']]
            ],
            layout: Object.assign({}, poiLayer.layout, {
              'icon-image': ['match', ['get', 'kind'],
                'parking', 'experimental-parking',
                'bank', 'experimental-bank',
                'pharmacy', 'experimental-pharmacy',
                'place_of_worship', ['case', ['==', ['get', 'kind_detail'], 'christian'],
                  'experimental-church', 'experimental-worship'],
                'experimental-shopping']
            }),
            paint: { 'text-color': '#526177', 'text-halo-color': '#fff', 'text-halo-width': 1 }
          }, 'pois');
          var protectedLayout = Object.assign({}, poiLayer.layout, {
            'text-offset': [0, 0],
            'text-variable-anchor': ['center']
          });
          delete protectedLayout['icon-image'];
          map.addLayer({
            id: 'experimental-protected-labels',
            type: 'symbol',
            source: 'geo-map',
            'source-layer': 'pois',
            filter: ['all',
              ['in', ['get', 'kind'], ['literal', ['protected_area', 'nature_reserve']]],
              ['>=', ['zoom'], ['get', 'min_zoom']]
            ],
            layout: protectedLayout,
            paint: { 'text-color': '#397349', 'text-halo-color': '#fff', 'text-halo-width': 1 }
          }, 'pois');
          map.addLayer({
            id: 'experimental-recreation-labels',
            type: 'symbol',
            source: 'geo-map',
            'source-layer': 'pois',
            filter: ['all',
              ['in', ['get', 'kind'], ['literal', ['sports_centre', 'ice_rink', 'dog_park']]],
              ['any', ['has', 'name'], ['has', 'pgf:name']],
              ['>=', ['zoom'], ['get', 'min_zoom']]
            ],
            layout: protectedLayout,
            paint: { 'text-color': '#456b56', 'text-halo-color': '#fff', 'text-halo-width': 1 }
          }, 'pois');
          map.setFilter('pois', ['all', poiLayer.filter,
            ['!', ['in', ['get', 'kind'], ['literal', ['peak', 'aerodrome']]]]]);
          map.addLayer({
            id: 'experimental-aerodromes',
            type: 'symbol',
            source: 'geo-map',
            'source-layer': 'pois',
            filter: ['all', ['==', ['get', 'kind'], 'aerodrome'],
              ['>=', ['zoom'], ['-', ['get', 'min_zoom'], 1]]],
            layout: poiLayer.layout,
            paint: poiLayer.paint
          }, 'pois');
          var peakName = ['coalesce', ['get', 'name:' + language], ['get', 'pgf:name:' + language],
            ['get', 'pgf:name'], ['get', 'name'], ''];
          map.addLayer({
            id: 'experimental-peaks',
            type: 'symbol',
            source: 'geo-map',
            'source-layer': 'pois',
            filter: ['all', ['==', ['get', 'kind'], 'peak'], ['>=', ['zoom'], ['-', ['get', 'min_zoom'], 1]]],
            layout: Object.assign({}, poiLayer.layout, {
              'icon-image': 'peak',
              'text-font': ['case', ['==', ['get', 'script'], 'Devanagari'],
                ['literal', ['Noto Sans Devanagari Regular v1']], ['literal', ['Noto Sans Regular']]],
              'text-field': ['case', ['has', 'elevation'],
                ['concat', peakName, ['case', ['!=', peakName, ''], '\n', ''], ['to-string', ['get', 'elevation']], ' m'],
                peakName]
            }),
            paint: { 'text-color': '#426945', 'text-halo-color': '#fff', 'text-halo-width': 1 }
          }, 'pois');
          map.addLayer({
            id: 'experimental-camps',
            type: 'symbol',
            source: 'geo-map',
            'source-layer': 'pois',
            filter: ['all',
              ['in', ['get', 'kind'], ['literal', ['camp_site', 'caravan_site']]],
              ['>=', ['zoom'], ['get', 'min_zoom']]
            ],
            layout: Object.assign({}, poiLayer.layout, { 'icon-image': 'experimental-camp' }),
            paint: { 'text-color': '#277344', 'text-halo-color': '#fff', 'text-halo-width': 1 }
          }, 'pois');
        } catch (error) {
          onError(error);
        }
      });
    }
  }

  return { createLayers: createLayers, addDetails: addDetails };
}());
