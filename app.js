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
  var layoutLabels = {
    fr: ['Liens Google Maps', 'Agrandir la carte', 'Réduire la carte'],
    en: ['Google Maps links', 'Expand map', 'Reduce map'],
    it: ['Link Google Maps', 'Espandi la mappa', 'Riduci la mappa'],
    es: ['Enlaces de Google Maps', 'Ampliar el mapa', 'Reducir el mapa'],
    de: ['Google Maps-Links', 'Karte vergrößern', 'Karte verkleinern'],
    pt: ['Links do Google Maps', 'Ampliar o mapa', 'Reduzir o mapa'],
    hi: ['Google Maps लिंक', 'नक्शा बड़ा करें', 'नक्शा छोटा करें'],
    ar: ['روابط Google Maps', 'توسيع الخريطة', 'تصغير الخريطة'],
    id: ['Tautan Google Maps', 'Perluas peta', 'Perkecil peta'],
    vi: ['Liên kết Google Maps', 'Mở rộng bản đồ', 'Thu nhỏ bản đồ']
  }[language];
  document.getElementById('google-summary').textContent = layoutLabels[0];

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
    document.getElementById('google-options').hidden = false;
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
  var legendLabels = {
    fr: ['Légende', 'Tracé GPS reçu', 'Position intermédiaire', 'Eau', 'Forêt', 'Parc / espace vert',
      'Milieu humide', 'Bâtiment cartographié', 'Terre agricole', 'Jardin', 'Cimetière',
      'Sentier piéton', 'Piste cyclable', 'Chemin de terre / piste', 'Limite administrative', 'Numéro d’adresse',
      'Les détails varient selon le zoom et les données disponibles. Un bâtiment absent de la carte peut exister sur le terrain.'],
    en: ['Legend', 'Received GPS trace', 'Intermediate position', 'Water', 'Forest', 'Park / green space',
      'Wetland', 'Mapped building', 'Farmland', 'Garden', 'Cemetery',
      'Walking path', 'Cycleway', 'Track', 'Administrative boundary', 'Address number',
      'Details vary with zoom and available data. A building missing from the map may exist on the ground.'],
    it: ['Legenda', 'Traccia GPS ricevuta', 'Posizione intermedia', 'Acqua', 'Bosco', 'Parco / area verde',
      'Zona umida', 'Edificio mappato', 'Terreno agricolo', 'Giardino', 'Cimitero',
      'Sentiero pedonale', 'Pista ciclabile', 'Strada sterrata / pista', 'Confine amministrativo', 'Numero civico',
      'I dettagli variano in base allo zoom e ai dati disponibili. Un edificio assente dalla mappa può esistere sul terreno.'],
    es: ['Leyenda', 'Trazado GPS recibido', 'Posición intermedia', 'Agua', 'Bosque', 'Parque / zona verde',
      'Humedal', 'Edificio cartografiado', 'Terreno agrícola', 'Jardín', 'Cementerio',
      'Sendero peatonal', 'Carril bici', 'Camino de tierra / pista', 'Límite administrativo', 'Número de dirección',
      'Los detalles varían según el zoom y los datos disponibles. Un edificio ausente del mapa puede existir en el terreno.'],
    de: ['Legende', 'Empfangene GPS-Spur', 'Zwischenposition', 'Wasser', 'Wald', 'Park / Grünfläche',
      'Feuchtgebiet', 'Kartiertes Gebäude', 'Ackerland', 'Garten', 'Friedhof',
      'Fußweg', 'Radweg', 'Feldweg / Fahrspur', 'Verwaltungsgrenze', 'Hausnummer',
      'Details hängen von Zoom und verfügbaren Daten ab. Ein auf der Karte fehlendes Gebäude kann vor Ort existieren.'],
    pt: ['Legenda', 'Traçado GPS recebido', 'Posição intermédia', 'Água', 'Floresta', 'Parque / espaço verde',
      'Zona húmida', 'Edifício cartografado', 'Terreno agrícola', 'Jardim', 'Cemitério',
      'Caminho pedonal', 'Ciclovia', 'Caminho de terra / pista', 'Limite administrativo', 'Número de endereço',
      'Os detalhes variam com o zoom e os dados disponíveis. Um edifício ausente do mapa pode existir no terreno.'],
    hi: ['मानचित्र संकेत', 'प्राप्त GPS पथ', 'बीच का स्थान', 'पानी', 'जंगल', 'पार्क / हरित क्षेत्र',
      'आर्द्रभूमि', 'मानचित्र पर दर्ज भवन', 'कृषि भूमि', 'बगीचा', 'कब्रिस्तान',
      'पैदल पथ', 'साइकिल पथ', 'कच्चा रास्ता', 'प्रशासनिक सीमा', 'पता संख्या',
      'विवरण ज़ूम और उपलब्ध डेटा पर निर्भर हैं। मानचित्र पर न दिखने वाला भवन वास्तविक स्थान पर मौजूद हो सकता है।'],
    ar: ['مفتاح الخريطة', 'مسار GPS المستلم', 'موقع وسيط', 'مياه', 'غابة', 'حديقة / مساحة خضراء',
      'أرض رطبة', 'مبنى مرسوم على الخريطة', 'أرض زراعية', 'بستان', 'مقبرة',
      'ممر للمشاة', 'مسار دراجات', 'طريق ترابي / مسلك', 'حدود إدارية', 'رقم العنوان',
      'تختلف التفاصيل حسب التكبير والبيانات المتاحة. قد يوجد مبنى على الأرض رغم غيابه عن الخريطة.'],
    id: ['Legenda', 'Jejak GPS yang diterima', 'Posisi antara', 'Air', 'Hutan', 'Taman / ruang hijau',
      'Lahan basah', 'Bangunan yang dipetakan', 'Lahan pertanian', 'Kebun', 'Pemakaman',
      'Jalur pejalan kaki', 'Jalur sepeda', 'Jalan tanah / jalur', 'Batas administratif', 'Nomor alamat',
      'Detail bergantung pada zoom dan data yang tersedia. Bangunan yang tidak ada di peta mungkin ada di lapangan.'],
    vi: ['Chú giải', 'Đường GPS đã nhận', 'Vị trí trung gian', 'Mặt nước', 'Rừng', 'Công viên / mảng xanh',
      'Đất ngập nước', 'Tòa nhà đã lập bản đồ', 'Đất nông nghiệp', 'Vườn', 'Nghĩa trang',
      'Đường đi bộ', 'Đường xe đạp', 'Đường đất / lối đi', 'Ranh giới hành chính', 'Số địa chỉ',
      'Chi tiết thay đổi theo mức thu phóng và dữ liệu có sẵn. Tòa nhà không có trên bản đồ vẫn có thể tồn tại trên thực địa.']
  }[language];
  var legend = document.getElementById('map-legend');
  if (legend) {
    document.getElementById('legend-summary').textContent = legendLabels[0];
    document.getElementById('legend-note').textContent = legendLabels[16];
    function addLegendItem(list, symbol, label) {
      var item = document.createElement('li');
      var swatch = document.createElement('span');
      swatch.className = 'legend-swatch legend-' + symbol;
      swatch.setAttribute('aria-hidden', 'true');
      var symbolPaths = {
        forest: 'M6 22L16 2L26 22ZM16 22V30',
        wetland: 'M2 5H14M8 13H24M2 21H14M18 29H30',
        garden: 'M6 16H26M16 6V26M9 9L23 23M9 23L23 9',
        cemetery: 'M8 26V14A8 8 0 0 1 24 14V26M4 28H28',
        camping: 'M5 25L16 7L27 25ZM12 25L16 17L20 25',
        toilets: 'M7 11H13V19H7ZM8 19V26M12 19V26M20 11H24L27 20H17ZM20 20V26M24 20V26M12 7A2 2 0 1 0 8 7A2 2 0 1 0 12 7M24 7A2 2 0 1 0 20 7A2 2 0 1 0 24 7',
        shopping: 'M8 12H24V25H8ZM12 12A4 4 0 0 1 20 12',
        pharmacy: 'M13 6H19V13H26V19H19V26H13V19H6V13H13Z',
        worship: 'M16 6L25 16L16 26L7 16Z'
      };
      if (symbolPaths[symbol]) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 32 32');
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', symbolPaths[symbol]);
        svg.appendChild(path);
        swatch.appendChild(svg);
      }
      var letters = { parking: 'P', bank: 'B', subway: 'M' };
      if (letters[symbol]) swatch.textContent = letters[symbol];
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(label));
      list.appendChild(item);
    }
    var routeLegend = document.getElementById('route-legend');
    if (points.length > 1) {
      addLegendItem(routeLegend, 'route', legendLabels[1]);
      addLegendItem(routeLegend, 'start', t.depart);
    }
    if (points.length > 2) addLegendItem(routeLegend, 'point', legendLabels[2]);
    addLegendItem(routeLegend, 'last', t.arrivee);
    var basemapLegend = document.getElementById('basemap-legend');
    ['water', 'forest', 'park', 'wetland', 'building', 'farmland', 'garden', 'cemetery',
      'trail', 'cycleway', 'track', 'boundary', 'address'].forEach(function (symbol, index) {
      addLegendItem(basemapLegend, symbol, legendLabels[index + 3]);
    });
    var extraLegendLabels = {
      fr: ['Stationnement', 'Toilettes', 'Camping / caravanes', 'Commerces', 'Pharmacie', 'Banque', 'Lieu de culte', 'Entrée de métro', 'Sable / plage', 'Terrain de sport'],
      en: ['Parking', 'Toilets', 'Camping / caravans', 'Shops', 'Pharmacy', 'Bank', 'Place of worship', 'Subway entrance', 'Sand / beach', 'Sports pitch'],
      it: ['Parcheggio', 'Servizi igienici', 'Campeggio / caravan', 'Negozi', 'Farmacia', 'Banca', 'Luogo di culto', 'Ingresso metropolitana', 'Sabbia / spiaggia', 'Campo sportivo'],
      es: ['Estacionamiento', 'Aseos', 'Camping / caravanas', 'Comercios', 'Farmacia', 'Banco', 'Lugar de culto', 'Entrada de metro', 'Arena / playa', 'Campo deportivo'],
      de: ['Parkplatz', 'Toiletten', 'Camping / Wohnwagen', 'Geschäfte', 'Apotheke', 'Bank', 'Gebetsstätte', 'U-Bahn-Eingang', 'Sand / Strand', 'Sportplatz'],
      pt: ['Estacionamento', 'Sanitários', 'Campismo / caravanas', 'Comércio', 'Farmácia', 'Banco', 'Local de culto', 'Entrada de metro', 'Areia / praia', 'Campo desportivo'],
      hi: ['पार्किंग', 'शौचालय', 'कैंपिंग / कारवां', 'दुकानें', 'दवा की दुकान', 'बैंक', 'पूजा स्थल', 'मेट्रो प्रवेश', 'रेत / समुद्र तट', 'खेल का मैदान'],
      ar: ['موقف سيارات', 'دورات مياه', 'تخييم / قوافل', 'متاجر', 'صيدلية', 'بنك', 'مكان عبادة', 'مدخل مترو', 'رمال / شاطئ', 'ملعب رياضي'],
      id: ['Parkir', 'Toilet', 'Perkemahan / karavan', 'Pertokoan', 'Apotek', 'Bank', 'Tempat ibadah', 'Pintu masuk kereta bawah tanah', 'Pasir / pantai', 'Lapangan olahraga'],
      vi: ['Bãi đỗ xe', 'Nhà vệ sinh', 'Cắm trại / xe lưu trú', 'Cửa hàng', 'Nhà thuốc', 'Ngân hàng', 'Nơi thờ tự', 'Lối vào tàu điện ngầm', 'Cát / bãi biển', 'Sân thể thao']
    }[language];
    ['parking', 'toilets', 'camping', 'shopping', 'pharmacy', 'bank', 'worship', 'subway',
      'sand', 'pitch'].forEach(function (symbol, index) {
      addLegendItem(basemapLegend, symbol, extraLegendLabels[index]);
    });
    var regionalLabels = {
      fr: ['Bâtiment — données du Québec', 'Adresse — données du Québec',
        'Violet : sources québécoises, MRC d’Antoine-Labelle seulement. La couleur indique la source, pas une précision garantie; les dates et la qualité varient.'],
      en: ['Building — Quebec data', 'Address — Quebec data',
        'Purple: Quebec sources, Antoine-Labelle MRC only. Color identifies the source, not guaranteed accuracy; dates and quality vary.'],
      it: ['Edificio — dati del Québec', 'Indirizzo — dati del Québec',
        'Viola: fonti del Québec, solo MRC Antoine-Labelle. Il colore indica la fonte, non una precisione garantita; date e qualità variano.'],
      es: ['Edificio — datos de Quebec', 'Dirección — datos de Quebec',
        'Violeta: fuentes de Quebec, solo MRC Antoine-Labelle. El color indica la fuente, no una precisión garantizada; las fechas y la calidad varían.'],
      de: ['Gebäude — Québec-Daten', 'Adresse — Québec-Daten',
        'Violett: Québec-Quellen, nur MRC Antoine-Labelle. Die Farbe zeigt die Quelle, keine garantierte Genauigkeit; Datum und Qualität variieren.'],
      pt: ['Edifício — dados do Quebec', 'Endereço — dados do Quebec',
        'Roxo: fontes do Quebec, apenas MRC Antoine-Labelle. A cor indica a fonte, não uma precisão garantida; datas e qualidade variam.'],
      hi: ['भवन — क्यूबेक डेटा', 'पता — क्यूबेक डेटा',
        'बैंगनी: क्यूबेक स्रोत, केवल Antoine-Labelle MRC। रंग स्रोत दर्शाता है, सटीकता की गारंटी नहीं; तिथियाँ और गुणवत्ता भिन्न हैं।'],
      ar: ['مبنى — بيانات كيبيك', 'عنوان — بيانات كيبيك',
        'البنفسجي: مصادر كيبيك، في Antoine-Labelle MRC فقط. اللون يحدد المصدر ولا يضمن الدقة؛ تختلف التواريخ والجودة.'],
      id: ['Bangunan — data Quebec', 'Alamat — data Quebec',
        'Ungu: sumber Quebec, hanya MRC Antoine-Labelle. Warna menunjukkan sumber, bukan jaminan akurasi; tanggal dan kualitas bervariasi.'],
      vi: ['Tòa nhà — dữ liệu Québec', 'Địa chỉ — dữ liệu Québec',
        'Màu tím: nguồn Québec, chỉ tại MRC Antoine-Labelle. Màu chỉ nguồn, không đảm bảo độ chính xác; ngày và chất lượng khác nhau.']
    }[language];
    addLegendItem(basemapLegend, 'qc-building', regionalLabels[0]);
    addLegendItem(basemapLegend, 'qc-address', regionalLabels[1]);
    var regionalNote = document.createElement('li');
    regionalNote.className = 'legend-regional-note';
    regionalNote.textContent = regionalLabels[2];
    basemapLegend.appendChild(regionalNote);
    legend.hidden = false;
  }
  var expandMap = document.getElementById('expand-map');
  expandMap.hidden = false;
  expandMap.textContent = layoutLabels[1];
  function setExpanded(expanded) {
    document.body.classList.toggle('map-expanded', expanded);
    ['header', '#google-options'].forEach(function (selector) {
      document.querySelector(selector).inert = expanded;
    });
    expandMap.setAttribute('aria-expanded', String(expanded));
    expandMap.textContent = layoutLabels[expanded ? 2 : 1];
    carte.invalidateSize({ pan: false });
  }
  expandMap.addEventListener('click', function () {
    setExpanded(expandMap.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && expandMap.getAttribute('aria-expanded') === 'true') {
      setExpanded(false);
      expandMap.focus();
    }
  });
  var mapResize = new ResizeObserver(function () {
    carte.invalidateSize({ pan: false });
  });
  mapResize.observe(document.getElementById('map'));
  L.control.zoom({ zoomInTitle: t.zoomIn, zoomOutTitle: t.zoomOut }).addTo(carte);
  var osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).on('tileerror', function () {
    mapStatus.hidden = false;
  });

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

  var testMode = new URLSearchParams(location.search).has('test');
  if (window.geoGooseWorldMap && !testMode) {
    try {
      window.geoGooseWorldMap.attach(carte, L, osmLayer, language, t.mapUnavailable);
    } catch (error) {
      console.error('Impossible de préparer la carte mondiale.', error);
      osmLayer.addTo(carte);
      mapStatus.hidden = false;
    }
  } else {
    osmLayer.addTo(carte);
  }

})();
