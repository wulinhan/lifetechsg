// Vercel serverless function: reports contact-intent clicks (WhatsApp buttons,
// email links) to Meta via the Conversions API, deduplicated against the
// browser Pixel event by a shared event_id.
//
// Unlike /api/lead there is no form data here, so Meta matches on the browser
// ids (fbp/fbc), IP and user-agent alone. That is weaker matching, but it is
// what makes these conversions survive ad blockers and iOS tracking limits.
//
// Environment variables are the same as api/lead.js: META_CAPI_ACCESS_TOKEN
// (required, never committed), plus optional META_PIXEL_ID / META_TEST_EVENT_CODE.

const { sendMetaEvent, clientIpFrom } = require('../lib/meta');

// This endpoint is public, so only known events and labels are accepted —
// otherwise anyone could post arbitrary conversions into the dataset.
const ALLOWED_EVENTS = new Set(['Lead', 'Contact']);
const ALLOWED_SOURCES = new Set([
  'whatsapp-fab',
  'whatsapp-button',
  'email-link',
]);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // sendBeacon may deliver the body as a plain string rather than parsed JSON.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const { event, source, meta } = body;
  if (!ALLOWED_EVENTS.has(event) || !ALLOWED_SOURCES.has(source)) {
    res.status(400).json({ error: 'Unknown event' });
    return;
  }

  const m = meta || {};
  if (!m.event_id) {
    res.status(400).json({ error: 'Missing event_id' });
    return;
  }

  // `status` reports what happened to the Meta call so the integration can be
  // checked from outside. It never affects the visitor: the response is always
  // 200 and they are already on their way to WhatsApp.
  let status = 'sent';
  try {
    const result = await sendMetaEvent({
      eventName: event,
      eventId: String(m.event_id).slice(0, 100),
      eventSourceUrl: String(m.event_source_url || '').slice(0, 500),
      customData: { content_name: source },
      fbp: m.fbp,
      fbc: m.fbc,
      clientIp: clientIpFrom(req),
      userAgent: req.headers['user-agent'],
    });
    if (result && result.skipped) status = 'skipped:' + result.skipped;
    else if (result && typeof result.events_received === 'number') {
      status = 'received:' + result.events_received;
    }
  } catch (err) {
    status = 'error';
    console.error('Meta CAPI error:', err.message);
  }

  res.status(200).json({ ok: true, meta: status });
};
