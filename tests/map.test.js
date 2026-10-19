'use strict';

(async function () {
  var frame = document.getElementById('map');
  var result = document.getElementById('result');
  var trace = 'g321IvkhhOoGoGoGoGoGvMoGoGoGoGoGvMoGoGoGoGoGvM';
  var checks = 0;
  var navigation = 0;
  function check(condition, description) {
    if (!condition) throw new Error(description);
    checks++;
  }
  function load(language, suffix) {
    return new Promise(function (resolve, reject) {
      var id = String(++navigation);
      var attempts = 0;
      frame.src = '../t/?lang=' + language + (suffix || '') + '&test=' + id + '#p=' + trace;
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
    result.textContent = 'PASS: ' + checks + ' checks';
  } catch (error) {
    result.textContent = 'FAIL: ' + error.message;
  }
})();
