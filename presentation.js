(function () {
  var hash = new URLSearchParams(location.hash.slice(1));
  if (location.pathname === '/' && hash.has('p')) {
    location.replace('/t/' + location.search + location.hash);
    return;
  }

  var params = new URLSearchParams(location.search);
  var requested = params.get('lang');
  var language = requested === 'fr' || requested === 'en'
    ? requested
    : ((navigator.language || 'fr').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en');

  function applyLanguage(nextLanguage, updateUrl) {
    language = nextLanguage;
    document.documentElement.lang = language === 'fr' ? 'fr-CA' : 'en';
    document.querySelectorAll('[data-fr][data-en]').forEach(function (element) {
      element.textContent = element.getAttribute('data-' + language);
    });
    document.querySelectorAll('[data-lang-link]').forEach(function (link) {
      link.href = link.getAttribute('data-lang-link') + '?lang=' + language;
    });

    var toggle = document.querySelector('[data-lang-toggle]');
    if (toggle) {
      toggle.textContent = language === 'fr' ? 'EN' : 'FR';
      toggle.setAttribute('aria-label', language === 'fr' ? 'Switch to English' : 'Passer en français');
    }

    if (updateUrl) {
      var next = new URL(location.href);
      next.searchParams.set('lang', language);
      history.replaceState(null, '', next.pathname + next.search + next.hash);
    }
  }

  var toggle = document.querySelector('[data-lang-toggle]');
  if (toggle) {
    toggle.addEventListener('click', function () {
      applyLanguage(language === 'fr' ? 'en' : 'fr', true);
    });
  }

  applyLanguage(language, false);
})();