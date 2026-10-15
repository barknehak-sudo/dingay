// Google Analytics 4. Paste the Measurement ID (G-…) from GA → Admin → Data streams → Web below.
// Empty = tracking off. /office is never tracked (it doesn't load this file).
// The site lives behind #/… routes, so each route change is sent as its own page view. Private parts of a
// link (the key in #/pay/DG-…/KEY and #/registry/DG-…/KEY, and the order number on the pay page) are cut off first.
(function () {
  var ID = 'G-85R6XY6WBN';
  window.track = function () {};
  if (!/^G-[A-Z0-9]+$/.test(ID) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', ID, { send_page_view: false });

  // '#/pay/DG-123456/abc' → '/pay', '#/registry/DG-123456/abc' → '/registry/DG-123456', '' → '/'
  function path() {
    var p = (location.hash || '').replace(/^#\/?/, '').replace(/\/$/, '').split('/');
    if (!p[0]) return '/';
    if (p[0] === 'pay') return '/pay';
    return '/' + p.slice(0, 2).map(encodeURIComponent).join('/');
  }
  var last = '';
  function view() {
    var p = path();
    if (p === last) return;
    last = p;
    gtag('event', 'page_view', { page_location: location.origin + p + location.search, page_path: p, page_title: document.title });
  }
  window.addEventListener('hashchange', view);
  view();

  // track('begin_checkout', {...}) etc. from the page.
  window.track = function (name, params) { gtag('event', name, params || {}); };
})();
