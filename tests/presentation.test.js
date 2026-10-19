'use strict';

(async function () {
  var frame = document.getElementById('site');
  var checks = 0;
  function check(condition, label) {
    if (!condition) throw new Error(label);
    checks++;
  }
  function luminance(color) {
    var values = color.match(/[\d.]+/g).slice(0, 3).map(function (value) {
      var channel = Number(value) / 255;
      return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }
  function contrast(foreground, background) {
    var a = luminance(foreground);
    var b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  function load(path, language) {
    return new Promise(function (resolve, reject) {
      frame.onload = resolve;
      frame.onerror = reject;
      frame.src = path + '?lang=' + language;
    });
  }
  try {
    for (var width of [360, 1100]) {
      frame.style.width = width + 'px';
      for (var path of ['../', '../privacy/']) {
        for (var language of ['fr', 'en']) {
          await load(path, language);
          var win = frame.contentWindow;
          var doc = frame.contentDocument;
          var style = win.getComputedStyle(doc.body);
          check(doc.documentElement.lang === (language === 'fr' ? 'fr-CA' : 'en'), 'Page language');
          check(win.getComputedStyle(doc.documentElement).colorScheme === 'dark', 'Dark theme');
          check(style.backgroundColor === 'rgb(3, 13, 27)', 'App navy background');
          check(doc.documentElement.scrollWidth <= width, 'No horizontal overflow at ' + width);
          check(contrast(style.color, style.backgroundColor) >= 7, 'Body text contrast');
          check(contrast('rgb(255, 255, 255)', 'rgb(0, 114, 201)') >= 4.5, 'Blue button gradient contrast');
          check(contrast('rgb(182, 204, 227)', 'rgb(13, 46, 84)') >= 4.5, 'Muted text on hero gradient');
          ['.site-header', '.site-footer', '.language-toggle', '.legal-contact', '.button'].forEach(function (selector) {
            doc.querySelectorAll(selector).forEach(function (element) {
              var colors = win.getComputedStyle(element);
              check(contrast(colors.color, colors.backgroundColor) >= 4.5, selector + ' contrast');
            });
          });
          doc.querySelectorAll('[data-lang-link]').forEach(function (link) {
            check(new URL(link.href).searchParams.get('lang') === language, 'Localized link');
          });
          check(doc.querySelector('h1') !== null, 'Page title');
          var toggle = doc.querySelector('[data-lang-toggle]');
          toggle.click();
          check(doc.documentElement.lang === (language === 'fr' ? 'en' : 'fr-CA'), 'Language toggle');
          check(new URL(win.location.href).searchParams.get('lang') !== language, 'Toggle updates URL');
        }
      }
    }
    document.getElementById('result').textContent = 'PASS: ' + checks + ' checks';
  } catch (error) {
    document.getElementById('result').textContent = 'FAIL: ' + error.message;
  }
})();
