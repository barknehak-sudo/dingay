/* Older phone browsers (Samsung Internet before v15, Chrome before 88 — common on Android 9 phones)
   ignore `aspect-ratio`, `inset` and container units (`cqw`). On those, stone and image boxes collapse
   to zero height and the certificate loses its layout. This rewrites those styles as React renders them.
   Does nothing on browsers that support them. Load before support.js. */
(function () {
  var sup = window.CSS && CSS.supports ? function (p, v) { try { return CSS.supports(p, v); } catch (e) { return false; } } : function () { return false; };
  var noAR = !sup('aspect-ratio', '1/1'), noInset = !sup('inset', '0'), noCQ = !sup('width', '1cqw');
  if (!noAR && !noInset && !noCQ) return;
  document.documentElement.setAttribute('data-compat', [noAR && 'ar', noInset && 'inset', noCQ && 'cq'].filter(Boolean).join(' '));

  var CQ = /(-?\d*\.?\d+)cqw/g;
  var ro = window.ResizeObserver ? new ResizeObserver(function (es) { for (var i = 0; i < es.length; i++) fit(es[i].target); }) : null;
  function fit(el) {
    var w = el.getBoundingClientRect().width;
    if (el.__dgAR) el.style.minHeight = w * el.__dgAR + 'px';
    if (el.__dgCQ) el.style.setProperty('--cqw', w / 100 + 'px');
  }
  function watch(el) {
    if (el.__dgW) return; el.__dgW = 1; fit(el);
    if (ro) ro.observe(el); else window.addEventListener('resize', function () { fit(el); });
  }
  function sides(v) {
    var p = String(v).trim().split(/\s+/), t = p[0], r = p[1] || t, b = p[2] || t, l = p[3] || r;
    return { top: t, right: r, bottom: b, left: l };
  }
  // Returns a fixed style object (or null if nothing to change) plus what the element needs measured.
  function fix(st) {
    var o = {}, changed = false, ar = 0, cq = false;
    for (var k in st) {
      var v = st[k];
      if (noCQ && typeof v === 'string' && v.indexOf('cqw') >= 0) { v = v.replace(CQ, 'calc($1*var(--cqw,1vw))'); changed = true; }
      if (k === 'inset' && noInset) { var s = sides(v); for (var q in s) o[q] = s[q]; changed = true; continue; }
      if (k === 'aspectRatio' && noAR) { var m = String(v).split('/'); var a = parseFloat(m[0]), b = parseFloat(m[1] || '1'); if (a > 0 && b > 0) ar = b / a; changed = true; continue; }
      if (k === 'containerType' && noCQ) cq = true;
      o[k] = v;
    }
    return changed || cq ? { style: o, ar: ar, cq: cq } : null;
  }
  function wrap(R) {
    if (!R || R.__dgCompat) return; R.__dgCompat = 1;
    // React's UMD build assigns window.React = {} first and fills in createElement afterwards,
    // so catch createElement whenever it's (re)assigned.
    var ce = R.createElement;
    function wrapped(type, props) {
      if (typeof type === 'string' && props && props.style && typeof props.style === 'object') {
        var f = fix(props.style);
        if (f) {
          var np = {}; for (var k in props) np[k] = props[k];
          np.style = f.style;
          if (f.ar || f.cq) {
            var orig = props.ref;
            np.ref = function (el) {
              if (el) { if (f.ar) el.__dgAR = f.ar; if (f.cq) el.__dgCQ = 1; watch(el); }
              if (typeof orig === 'function') orig(el); else if (orig && typeof orig === 'object') orig.current = el;
            };
          }
          var args = Array.prototype.slice.call(arguments); args[1] = np;
          return ce.apply(this, args);
        }
      }
      return ce.apply(this, arguments);
    }
    try {
      Object.defineProperty(R, 'createElement', { configurable: true, enumerable: true, get: function () { return ce ? wrapped : undefined; }, set: function (fn) { ce = fn; } });
    } catch (e) { if (ce) R.createElement = wrapped; }
  }
  // React arrives later as a UMD script that assigns window.React — wrap it the moment it does.
  if (window.React) wrap(window.React);
  else {
    var _R;
    try {
      Object.defineProperty(window, 'React', { configurable: true, get: function () { return _R; }, set: function (v) { _R = v; wrap(v); } });
    } catch (e) {}
  }
})();
