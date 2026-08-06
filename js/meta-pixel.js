// Meta Pixel base code + PageView.
//
// The Pixel (dataset) ID is public by nature — it ships to every browser, so it
// is safe here. The Conversions API *access token* is NOT in this file and must
// never be: it lives server-side only, in api/lead.js via an environment
// variable. Browser events fired here are deduplicated against the server-side
// Conversions API events by a shared event_id.
(function () {
  var PIXEL_ID = '1599859951666915'; // LTSG dataset

  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  // ---- Helpers shared with main.js so browser and server events line up ----

  function cookie(name) {
    var m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : '';
  }

  // One id per conversion, sent with BOTH the browser event and the server
  // event so Meta counts them once instead of twice.
  window.metaEventId = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'e' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
  };

  // Click id / browser id cookies. These are passed through unhashed.
  window.metaIdentifiers = function () {
    var fbc = cookie('_fbc');
    if (!fbc) {
      // Pixel not ready yet (or blocked) but the ad click id is in the URL:
      // build the value the same way the pixel would.
      var clid = new URLSearchParams(location.search).get('fbclid');
      if (clid) fbc = 'fb.1.' + Date.now() + '.' + clid;
    }
    return { fbp: cookie('_fbp'), fbc: fbc };
  };
})();
