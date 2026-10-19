'use strict';

// Les positions sont dans le fragment (#p=...) : il n'est jamais envoyé au serveur.
(function () {
  var params = new URLSearchParams(location.hash.slice(1));
  var requestedLanguage = params.get('lang') || new URLSearchParams(location.search).get('lang');
  var translations = {
    fr: {
      point: '{count} point', points: '{count} points', depart: 'Départ', arrivee: 'Dernière position',
      google: 'Dernière position dans Google Maps', erreur: 'Lien de trajet invalide ou incomplet.',
      route: 'Itinéraire Google Maps — partie {part}/{total}',
      routeNote: 'Google recalcule un itinéraire : ce ne sera pas le tracé GPS exact. Les parties se suivent et couvrent tous les points de ce lien. Leur ouverture transmet ces coordonnées à Google.',
      mapUnavailable: 'Carte indisponible. Vous pouvez utiliser les liens Google Maps ci-dessus.',
      tagline: 'Un texto, un HONK. On veille les uns sur les autres.',
      zoomIn: 'Zoom avant', zoomOut: 'Zoom arrière'
    },
    en: {
      point: '{count} point', points: '{count} points', depart: 'Start', arrivee: 'Last position',
      google: 'Last position in Google Maps', erreur: 'Invalid or incomplete route link.',
      route: 'Google Maps directions — part {part}/{total}',
      routeNote: 'Google recalculates directions: this will not be the exact GPS trace. Consecutive parts cover all points in this link. Opening them shares those coordinates with Google.',
      mapUnavailable: 'Map unavailable. You can use the Google Maps links above.',
      tagline: 'One text. One HONK. Everyone looking out for each other.',
      zoomIn: 'Zoom in', zoomOut: 'Zoom out'
    },
    it: {
      point: '{count} punto', points: '{count} punti', depart: 'Partenza', arrivee: 'Ultima posizione',
      google: 'Apri in Google Maps', erreur: 'Link del percorso non valido o incompleto.',
      route: 'Itinerario Google Maps — parte {part}/{total}',
      routeNote: 'Google ricalcola un itinerario: non sarà la traccia GPS esatta. Le parti consecutive coprono tutti i punti di questo link. Aprendole, queste coordinate vengono condivise con Google.',
      mapUnavailable: 'Mappa non disponibile. Puoi usare i link Google Maps qui sopra.',
      tagline: 'Un messaggio, un HONK. Ci prendiamo cura gli uni degli altri.',
      zoomIn: 'Ingrandisci', zoomOut: 'Riduci'
    },
    es: {
      point: '{count} punto', points: '{count} puntos', depart: 'Salida', arrivee: 'Última posición',
      google: 'Abrir en Google Maps', erreur: 'Enlace de ruta no válido o incompleto.',
      route: 'Ruta de Google Maps — parte {part}/{total}',
      routeNote: 'Google recalcula una ruta: no será el trazado GPS exacto. Las partes consecutivas cubren todos los puntos de este enlace. Al abrirlas, se comparten esas coordenadas con Google.',
      mapUnavailable: 'Mapa no disponible. Puedes usar los enlaces de Google Maps de arriba.',
      tagline: 'Un mensaje, un HONK. Nos cuidamos unos a otros.',
      zoomIn: 'Acercar', zoomOut: 'Alejar'
    },
    de: {
      point: '{count} Punkt', points: '{count} Punkte', depart: 'Start', arrivee: 'Letzte Position',
      google: 'In Google Maps öffnen', erreur: 'Ungültiger oder unvollständiger Routenlink.',
      route: 'Google Maps-Route — Teil {part}/{total}',
      routeNote: 'Google berechnet die Route neu: Sie entspricht nicht der exakten GPS-Spur. Die aufeinanderfolgenden Teile enthalten alle Punkte dieses Links. Beim Öffnen werden diese Koordinaten an Google übermittelt.',
      mapUnavailable: 'Karte nicht verfügbar. Die Google Maps-Links oben sind weiterhin nutzbar.',
      tagline: 'Eine Nachricht, ein HONK. Wir passen aufeinander auf.',
      zoomIn: 'Vergrößern', zoomOut: 'Verkleinern'
    },
    pt: {
      point: '{count} ponto', points: '{count} pontos', depart: 'Partida', arrivee: 'Última posição',
      google: 'Abrir no Google Maps', erreur: 'Link de percurso inválido ou incompleto.',
      route: 'Itinerário Google Maps — parte {part}/{total}',
      routeNote: 'O Google recalcula um itinerário: não será o traçado GPS exato. As partes consecutivas abrangem todos os pontos deste link. Ao abri-las, estas coordenadas são partilhadas com o Google.',
      mapUnavailable: 'Mapa indisponível. Pode usar os links do Google Maps acima.',
      tagline: 'Uma mensagem, um HONK. Cuidamos uns dos outros.',
      zoomIn: 'Aproximar', zoomOut: 'Afastar'
    },
    hi: {
      point: '{count} बिंदु', points: '{count} बिंदु', depart: 'प्रस्थान', arrivee: 'अंतिम स्थान',
      google: 'Google Maps में खोलें', erreur: 'मार्ग का लिंक अमान्य या अधूरा है।',
      route: 'Google Maps मार्ग — भाग {part}/{total}',
      routeNote: 'Google मार्ग की दोबारा गणना करता है: यह सटीक GPS ट्रेस नहीं होगा। क्रमिक भाग इस लिंक के सभी बिंदुओं को कवर करते हैं। इन्हें खोलने पर ये निर्देशांक Google से साझा किए जाते हैं।',
      mapUnavailable: 'नक्शा उपलब्ध नहीं है। आप ऊपर दिए गए Google Maps लिंक का उपयोग कर सकते हैं।',
      tagline: 'एक संदेश, एक HONK। हम एक-दूसरे का ख्याल रखते हैं।',
      zoomIn: 'ज़ूम इन करें', zoomOut: 'ज़ूम आउट करें'
    },
    ar: {
      point: 'عدد النقاط: {count}', points: 'عدد النقاط: {count}', depart: 'نقطة الانطلاق', arrivee: 'آخر موقع',
      google: 'فتح في Google Maps', erreur: 'رابط المسار غير صالح أو غير مكتمل.',
      route: 'مسار Google Maps — الجزء {part}/{total}',
      routeNote: 'يعيد Google حساب المسار، لذا لن يكون مطابقًا لتتبع GPS الدقيق. تغطي الأجزاء المتتالية جميع نقاط هذا الرابط. يؤدي فتحها إلى مشاركة هذه الإحداثيات مع Google.',
      mapUnavailable: 'الخريطة غير متاحة. يمكنك استخدام روابط Google Maps أعلاه.',
      tagline: 'رسالة واحدة، وHONK واحد. نعتني ببعضنا البعض.',
      zoomIn: 'تكبير', zoomOut: 'تصغير'
    },
    id: {
      point: '{count} titik', points: '{count} titik', depart: 'Titik awal', arrivee: 'Posisi terakhir',
      google: 'Buka di Google Maps', erreur: 'Tautan rute tidak valid atau tidak lengkap.',
      route: 'Rute Google Maps — bagian {part}/{total}',
      routeNote: 'Google menghitung ulang rute: hasilnya bukan jejak GPS yang persis sama. Bagian berurutan mencakup semua titik dalam tautan ini. Membukanya membagikan koordinat tersebut dengan Google.',
      mapUnavailable: 'Peta tidak tersedia. Anda dapat menggunakan tautan Google Maps di atas.',
      tagline: 'Satu pesan, satu HONK. Kita saling menjaga.',
      zoomIn: 'Perbesar', zoomOut: 'Perkecil'
    },
    vi: {
      point: '{count} điểm', points: '{count} điểm', depart: 'Điểm xuất phát', arrivee: 'Vị trí cuối cùng',
      google: 'Mở trong Google Maps', erreur: 'Liên kết lộ trình không hợp lệ hoặc không đầy đủ.',
      route: 'Lộ trình Google Maps — phần {part}/{total}',
      routeNote: 'Google tính lại lộ trình: đây không phải đường đi GPS chính xác. Các phần liên tiếp bao gồm tất cả điểm trong liên kết này. Khi mở, các tọa độ này sẽ được chia sẻ với Google.',
      mapUnavailable: 'Bản đồ không khả dụng. Bạn có thể dùng các liên kết Google Maps ở trên.',
      tagline: 'Một tin nhắn, một HONK. Chúng ta cùng quan tâm đến nhau.',
      zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ'
    }
  };
  function supportedLanguage(tag) {
    var code = (tag || '').toLowerCase().replace(/_/g, '-').split('-')[0];
    return Object.prototype.hasOwnProperty.call(translations, code) ? code : null;
  }
  var language = requestedLanguage
    ? (supportedLanguage(requestedLanguage) || 'en')
    : (supportedLanguage(navigator.language) || 'en');
  var t = translations[language];
  var controls = {
    fr: ['Mode de déplacement', 'En voiture', 'À pied'],
    en: ['Travel mode', 'Driving', 'Walking'],
    it: ['Modalità di viaggio', 'In auto', 'A piedi'],
    es: ['Modo de viaje', 'En coche', 'A pie'],
    de: ['Fortbewegung', 'Mit dem Auto', 'Zu Fuß'],
    pt: ['Modo de deslocação', 'De carro', 'A pé'],
    hi: ['यात्रा का तरीका', 'कार से', 'पैदल'],
    ar: ['وسيلة التنقل', 'بالسيارة', 'سيرًا على الأقدام'],
    id: ['Mode perjalanan', 'Berkendara', 'Berjalan kaki'],
    vi: ['Phương thức di chuyển', 'Ô tô', 'Đi bộ']
  }[language];
  ['travel-label', 'travel-driving', 'travel-walking']
    .forEach(function (id, index) { document.getElementById(id).textContent = controls[index]; });
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('map').dir = 'ltr';
  document.getElementById('tagline').textContent = t.tagline;

  // Même algorithme que l'app : "encoded polyline" (précision 1e5) avec alphabet base64url.
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var MAX_POINTS = 5000;

  function decoder(texte) {
    var points = [];
    var i = 0, lat = 0, lon = 0;
    function valeur() {
      var resultat = 0, decalage = 0, b;
      do {
        if (i >= texte.length || decalage > 30) throw new Error('fin');
        b = ALPHABET.indexOf(texte.charAt(i++));
        if (b < 0) throw new Error('caractere');
        resultat |= (b & 0x1f) << decalage;
        decalage += 5;
      } while (b >= 0x20);
      return (resultat & 1) ? ~(resultat >> 1) : (resultat >> 1);
    }
    while (i < texte.length && points.length < MAX_POINTS) {
      lat += valeur();
      lon += valeur();
      var p = [lat / 1e5, lon / 1e5];
      if (Math.abs(p[0]) > 90 || Math.abs(p[1]) > 180) throw new Error('hors limites');
      points.push(p);
    }
    return points;
  }

  function afficherErreur() {
    var map = document.getElementById('map');
    var div = document.createElement('div');
    div.className = 'message';
    div.textContent = t.erreur;
    map.replaceWith(div);
  }

  var points;
  try {
    points = decoder(params.get('p') || '');
  } catch (e) {
    points = [];
  }
  if (points.length === 0) {
    afficherErreur();
    return;
  }

  var dernier = points[points.length - 1];
  document.getElementById('info').textContent = (points.length === 1 ? t.point : t.points)
    .replace('{count}', points.length);
  var lien = document.getElementById('google');
  lien.href = 'https://www.google.com/maps/search/?api=1&query=' + dernier[0].toFixed(5) + ',' + dernier[1].toFixed(5);
  lien.textContent = t.google;
  lien.hidden = false;

  // Trois étapes intermédiaires sont compatibles avec les navigateurs mobiles.
  if (points.length > 1) {
    var routes = document.getElementById('google-routes');
    var total = Math.ceil((points.length - 1) / 4);
    document.getElementById('route-note').textContent = t.routeNote;
    for (var start = 0, part = 1; start < points.length - 1; start += 4, part++) {
      var segment = points.slice(start, start + 5);
      var query = new URLSearchParams({
        api: '1', origin: segment[0].join(','), destination: segment[segment.length - 1].join(','),
        travelmode: document.getElementById('travel-mode').value
      });
      if (segment.length > 2) {
        query.set('waypoints', segment.slice(1, -1).map(function (point) { return point.join(','); }).join('|'));
      }
      var routeLink = document.createElement('a');
      routeLink.href = 'https://www.google.com/maps/dir/?' + query.toString();
      routeLink.target = '_blank';
      routeLink.rel = 'noopener';
      routeLink.textContent = t.route.replace('{part}', part).replace('{total}', total);
      routes.appendChild(routeLink);
    }
    document.getElementById('route-options').hidden = false;
    document.getElementById('travel-mode').addEventListener('change', function (event) {
      routes.querySelectorAll('a').forEach(function (link) {
        var url = new URL(link.href);
        url.searchParams.set('travelmode', event.target.value);
        link.href = url.toString();
      });
    });
  }

  var mapStatus = document.getElementById('map-status');
  mapStatus.textContent = t.mapUnavailable;
  if (typeof L === 'undefined') {
    mapStatus.hidden = false;
    return;
  }
  var carte = L.map('map', { zoomControl: false });
  L.control.zoom({ zoomInTitle: t.zoomIn, zoomOutTitle: t.zoomOut }).addTo(carte);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).on('tileerror', function () {
    mapStatus.hidden = false;
  }).addTo(carte);

  var routeColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();
  var ligne = L.polyline(points, { color: routeColor, weight: 5, opacity: 0.85 }).addTo(carte);

  for (var k = 1; k < points.length - 1; k++) {
    L.circleMarker(points[k], { radius: 4, color: routeColor, fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(carte);
  }
  L.circleMarker(points[0], { radius: 8, color: '#fff', fillColor: '#16a34a', fillOpacity: 1, weight: 3 })
    .bindTooltip(t.depart).addTo(carte);
  L.circleMarker(dernier, { radius: 9, color: '#fff', fillColor: '#dc2626', fillOpacity: 1, weight: 3 })
    .bindTooltip(t.arrivee).addTo(carte);

  if (points.length > 1) {
    carte.fitBounds(ligne.getBounds(), { padding: [30, 30], maxZoom: 17 });
  } else {
    carte.setView(dernier, 16);
  }

})();
