'use strict';

window.geoGooseWorldMap = (function () {
  var archiveUrl = 'https://world-maps.geogoose.app/file/geogoose-maps-world/20261115.pmtiles';
  var regionalUrl = new URL('maps/antoine-labelle-20261117.pmtiles', new URL('.', document.currentScript.src)).href;
  var messages = {
    fr: {
      loading: 'Chargement de la carte mondiale…',
      slow: 'La carte mondiale prend du temps à charger.',
      fallback: 'Utiliser la carte OpenStreetMap',
      requested: 'Carte OpenStreetMap demandée.',
      error: 'Erreur de la carte mondiale.',
      rtl: 'Le composant pour les écritures de droite à gauche est indisponible.'
    },
    en: {
      loading: 'Loading the world map…',
      slow: 'The world map is taking a while to load.',
      fallback: 'Use the OpenStreetMap map',
      requested: 'OpenStreetMap requested.',
      error: 'World map error.',
      rtl: 'The right-to-left text component is unavailable.'
    },
    it: {
      loading: 'Caricamento della mappa mondiale…',
      slow: 'La mappa mondiale impiega tempo a caricarsi.',
      fallback: 'Usa la mappa OpenStreetMap',
      requested: 'OpenStreetMap richiesto.',
      error: 'Errore della mappa mondiale.',
      rtl: 'Il componente per le scritture da destra a sinistra non è disponibile.'
    },
    es: {
      loading: 'Cargando el mapa mundial…',
      slow: 'El mapa mundial tarda en cargar.',
      fallback: 'Usar el mapa de OpenStreetMap',
      requested: 'OpenStreetMap solicitado.',
      error: 'Error del mapa mundial.',
      rtl: 'El componente para escrituras de derecha a izquierda no está disponible.'
    },
    de: {
      loading: 'Weltkarte wird geladen…',
      slow: 'Das Laden der Weltkarte dauert länger.',
      fallback: 'OpenStreetMap-Karte verwenden',
      requested: 'OpenStreetMap angefordert.',
      error: 'Fehler der Weltkarte.',
      rtl: 'Die Komponente für rechts-nach-links-Schriften ist nicht verfügbar.'
    },
    pt: {
      loading: 'A carregar o mapa mundial…',
      slow: 'O mapa mundial está a demorar a carregar.',
      fallback: 'Usar o mapa OpenStreetMap',
      requested: 'OpenStreetMap solicitado.',
      error: 'Erro do mapa mundial.',
      rtl: 'O componente para escrita da direita para a esquerda não está disponível.'
    },
    hi: {
      loading: 'विश्व मानचित्र लोड हो रहा है…',
      slow: 'विश्व मानचित्र लोड होने में समय लग रहा है।',
      fallback: 'OpenStreetMap मानचित्र का उपयोग करें',
      requested: 'OpenStreetMap चुना गया।',
      error: 'विश्व मानचित्र में त्रुटि।',
      rtl: 'दाएँ-से-बाएँ लेखन घटक उपलब्ध नहीं है।'
    },
    ar: {
      loading: 'جارٍ تحميل خريطة العالم…',
      slow: 'يستغرق تحميل خريطة العالم وقتًا.',
      fallback: 'استخدام خريطة OpenStreetMap',
      requested: 'تم اختيار OpenStreetMap.',
      error: 'خطأ في خريطة العالم.',
      rtl: 'مكوّن النص من اليمين إلى اليسار غير متاح.'
    },
    id: {
      loading: 'Memuat peta dunia…',
      slow: 'Peta dunia membutuhkan waktu untuk dimuat.',
      fallback: 'Gunakan peta OpenStreetMap',
      requested: 'OpenStreetMap dipilih.',
      error: 'Kesalahan peta dunia.',
      rtl: 'Komponen teks kanan-ke-kiri tidak tersedia.'
    },
    vi: {
      loading: 'Đang tải bản đồ thế giới…',
      slow: 'Bản đồ thế giới tải chậm.',
      fallback: 'Dùng bản đồ OpenStreetMap',
      requested: 'Đã chọn OpenStreetMap.',
      error: 'Lỗi bản đồ thế giới.',
      rtl: 'Thành phần chữ từ phải sang trái không khả dụng.'
    }
  };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Impossible de charger la bibliothèque cartographique : ' + src));
      };
      document.head.appendChild(script);
    });
  }

  function loadDependencies() {
    var scripts = [];
    if (!window.maplibregl) scripts.push('https://unpkg.com/maplibre-gl@5.0.1/dist/maplibre-gl.js');
    if (!window.pmtiles) scripts.push('https://unpkg.com/pmtiles@4.2.1/dist/pmtiles.js');
    if (!window.basemaps) scripts.push('https://unpkg.com/@protomaps/basemaps@5.7.2/dist/basemaps.js');
    return scripts.reduce(function (chain, src) {
      return chain.then(function () { return loadScript(src); });
    }, Promise.resolve());
  }

  function attach(map, leaflet, osmLayer, language, unavailableMessage) {
    var text = messages[language] || messages.en;
    var status = document.getElementById('map-status');
    var fallbackButton = document.getElementById('map-fallback');
    var basemapLegend = document.getElementById('basemap-legend');
    var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>' +
      ' | &copy; Gouvernement du Québec — <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>';
    var cloud = null;
    var cloudContainer = null;
    var switched = false;
    var loading = false;
    var animatingZoom = false;
    var rtlUnavailable = false;
    var loadingTimer;
    var slowTimer;

    function clearLoading() {
      loading = false;
      clearTimeout(loadingTimer);
      clearTimeout(slowTimer);
      if (document.activeElement === fallbackButton) {
        document.getElementById('expand-map').focus();
      }
      fallbackButton.hidden = true;
    }

    function fallback(reason) {
      if (switched) return;
      switched = true;
      if (basemapLegend) basemapLegend.hidden = true;
      clearLoading();
      if (cloud) {
        cloud.remove();
        cloud = null;
        map.attributionControl.removeAttribution(attribution);
      }
      if (cloudContainer && cloudContainer.parentNode) {
        cloudContainer.parentNode.removeChild(cloudContainer);
      }
      cloudContainer = null;
      if (!map.hasLayer(osmLayer)) osmLayer.addTo(map);
      status.textContent = reason;
      status.hidden = false;
    }

    function startLoading() {
      if (switched || loading) return;
      loading = true;
      loadingTimer = setTimeout(function () {
        if (!switched && loading) {
          status.textContent = text.loading;
          status.hidden = false;
        }
      }, 500);
      slowTimer = setTimeout(function () {
        if (!switched && loading) {
          status.textContent = text.slow;
          status.hidden = false;
          fallbackButton.hidden = false;
        }
      }, 8000);
    }

    fallbackButton.textContent = text.fallback;
    fallbackButton.addEventListener('click', function () {
      fallback(text.requested);
    });

    startLoading();
    loadDependencies().then(function () {
      if (switched) return;
      if (!window.geoGooseMapStyle) throw new Error('Le style de la carte GeoGoose est introuvable.');

      maplibregl.setRTLTextPlugin(
        'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js',
        false
      ).catch(function (error) {
        console.error('Composant RTL indisponible.', error);
        rtlUnavailable = true;
        if (!switched) {
          status.textContent = text.rtl;
          status.hidden = false;
        }
      });

      if (!window.geoGooseRegionalMap) throw new Error('Le lecteur des données québécoises est introuvable.');
      maplibregl.addProtocol('geogoose', geoGooseRegionalMap.createProtocol(
        new pmtiles.PMTiles(archiveUrl), new pmtiles.PMTiles(regionalUrl)
      ));

      cloudContainer = document.createElement('div');
      cloudContainer.className = 'world-map-cloud leaflet-zoom-animated';
      map.getContainer().insertBefore(cloudContainer, map.getContainer().firstChild);
      leaflet.DomUtil.setTransform(cloudContainer, leaflet.point(0, 0), 1);
      var center = map.getCenter();
      cloud = new maplibregl.Map({
        container: cloudContainer,
        interactive: false,
        attributionControl: false,
        center: [center.lng, center.lat],
        zoom: map.getZoom() - 1,
        style: {
          version: 8,
          glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
          sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
          sources: {
            'geo-map': {
              type: 'vector',
              tiles: ['geogoose://{z}/{x}/{y}'],
              minzoom: 0,
              maxzoom: 15,
              attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> | © Gouvernement du Québec — CC BY 4.0'
            }
          },
          layers: geoGooseMapStyle.createLayers(language)
        }
      });
      map.attributionControl.addAttribution(attribution);
      if (basemapLegend) basemapLegend.hidden = false;
      geoGooseMapStyle.addDetails(cloud, language, function (error) {
        console.error('Erreur du style de carte mondiale.', error);
        fallback(text.error + ' ' + (unavailableMessage || ''));
      });
      cloud.on('error', function (event) {
        console.error('Erreur de carte mondiale.', event.error);
        fallback(text.error + ' ' + (unavailableMessage || ''));
      });
      cloud.on('idle', function () {
        if (switched) return;
        clearLoading();
        if (rtlUnavailable) {
          status.textContent = text.rtl;
          status.hidden = false;
        } else {
          status.textContent = '';
          status.hidden = true;
        }
      });

      function syncCloud() {
        if (!cloud || switched || animatingZoom) return;
        var current = map.getCenter();
        cloud.resize();
        cloud.jumpTo({ center: [current.lng, current.lat], zoom: map.getZoom() - 1 });
      }

      map.on('zoomanim', function (event) {
        if (!cloud || switched) return;
        animatingZoom = true;
        var scale = map.getZoomScale(event.zoom, map.getZoom());
        var midpoint = map.getSize().divideBy(2);
        var shift = map.project(map.getCenter(), map.getZoom())
          .subtract(map.project(event.center, map.getZoom()));
        leaflet.DomUtil.setTransform(
          cloudContainer,
          midpoint.multiplyBy(1 - scale).add(shift.multiplyBy(scale)),
          scale
        );
      });
      map.on('zoomend', function () {
        if (!cloud || switched || !animatingZoom) return;
        animatingZoom = false;
        var currentContainer = cloudContainer;
        currentContainer.style.transition = 'none';
        leaflet.DomUtil.setTransform(currentContainer, leaflet.point(0, 0), 1);
        syncCloud();
        requestAnimationFrame(function () { currentContainer.style.transition = ''; });
      });
      map.on('move zoom resize', syncCloud);
    }).catch(function (error) {
      console.error('Impossible de démarrer la carte mondiale.', error);
      fallback(text.error + ' ' + (unavailableMessage || ''));
    });
  }

  return { attach: attach };
}());
