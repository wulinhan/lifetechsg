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

  // ---- Contact clicks count as leads ------------------------------------
  // Reaching for WhatsApp or email is the other way people convert here, so
  // those clicks are reported as Lead events too — browser-side via the Pixel
  // and server-side via /api/track, sharing one event_id.

  var TRACK_API = '/api/track';
  var SUPPORT_NUMBER = '6584483825'; // existing-customer troubleshooting line

  function leadSourceFor(link) {
    var href = link.getAttribute('href') || '';
    if (href.indexOf('mailto:') === 0) return 'email-link';
    if (href.indexOf('wa.me/') === -1) return null;
    // A customer with a faulty device is not a new lead.
    if (href.indexOf(SUPPORT_NUMBER) !== -1) return null;
    return link.className.indexOf('wa-fab') !== -1 ? 'whatsapp-fab' : 'whatsapp-button';
  }

  // One contact lead per visit: clicking WhatsApp three times is still one
  // person getting in touch, and shouldn't treble the conversion count.
  function countedThisVisit() {
    try { return sessionStorage.getItem('ltsg_contact_lead') === '1'; }
    catch (e) { return false; }
  }
  function markCounted() {
    try { sessionStorage.setItem('ltsg_contact_lead', '1'); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var link = e.target.closest('a[href]');
    if (!link) return;
    var source = leadSourceFor(link);
    if (!source || countedThisVisit()) return;
    markCounted();

    var eventId = window.metaEventId();
    var ids = window.metaIdentifiers();

    if (window.fbq) {
      fbq('track', 'Lead', { content_name: source }, { eventID: eventId });
    }

    var payload = JSON.stringify({
      event: 'Lead',
      source: source,
      meta: {
        event_id: eventId,
        fbp: ids.fbp || '',
        fbc: ids.fbc || '',
        event_source_url: location.href
      }
    });

    // sendBeacon (with a keepalive fetch fallback) so the report still lands
    // if the click takes the visitor away from the page.
    var sent = false;
    try {
      if (navigator.sendBeacon) {
        sent = navigator.sendBeacon(TRACK_API, new Blob([payload], { type: 'application/json' }));
      }
    } catch (err) { sent = false; }
    if (!sent) {
      fetch(TRACK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(function () {});
    }
  }, true);
})();
