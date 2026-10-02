'use strict';

// Les positions sont dans le fragment (#p=...) : il n'est jamais envoyé au serveur.
(function () {
  var fr = (navigator.language || 'fr').toLowerCase().indexOf('fr') === 0;
  var t = fr
    ? { points: ' points', depart: 'Départ', arrivee: 'Dernière position', google: 'Ouvrir dans Google Maps', erreur: 'Lien de trajet invalide ou incomplet.' }
    : { points: ' points', depart: 'Start', arrivee: 'Last position', google: 'Open in Google Maps', erreur: 'Invalid or incomplete route link.' };
  document.documentElement.lang = fr ? 'fr' : 'en';

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
    var params = new URLSearchParams(location.hash.slice(1));
    points = decoder(params.get('p') || '');
  } catch (e) {
    points = [];
  }
  if (points.length === 0) {
    afficherErreur();
    return;
  }

  var carte = L.map('map');
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(carte);

  var ligne = L.polyline(points, { color: '#9333ea', weight: 5, opacity: 0.85 }).addTo(carte);

  for (var k = 1; k < points.length - 1; k++) {
    L.circleMarker(points[k], { radius: 4, color: '#9333ea', fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(carte);
  }
  L.circleMarker(points[0], { radius: 8, color: '#fff', fillColor: '#16a34a', fillOpacity: 1, weight: 3 })
    .bindTooltip(t.depart).addTo(carte);
  var dernier = points[points.length - 1];
  L.circleMarker(dernier, { radius: 9, color: '#fff', fillColor: '#dc2626', fillOpacity: 1, weight: 3 })
    .bindTooltip(t.arrivee).addTo(carte);

  if (points.length > 1) {
    carte.fitBounds(ligne.getBounds(), { padding: [30, 30], maxZoom: 17 });
  } else {
    carte.setView(dernier, 16);
  }

  document.getElementById('info').textContent = points.length + t.points;
  var lien = document.getElementById('google');
  lien.href = 'https://www.google.com/maps/search/?api=1&query=' + dernier[0].toFixed(5) + ',' + dernier[1].toFixed(5);
  lien.textContent = t.google;
  lien.hidden = false;
})();
