// Shared Meta Conversions API sender, used by the serverless functions in /api.
//
// Meta requires contact details to be normalised (trimmed, lowercased, no
// punctuation) and then SHA-256 hashed. The browser ids (fbp/fbc), IP and
// user-agent are the exception: those are sent as-is.
//
// The access token comes from META_CAPI_ACCESS_TOKEN and must never be
// committed. With no token set, every call here is a no-op.

const crypto = require('crypto');

const META_API_VERSION = 'v21.0';
const DEFAULT_PIXEL_ID = '1599859951666915'; // LTSG dataset

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hashed(value) {
  const v = String(value || '').trim().toLowerCase();
  return v ? [sha256(v)] : undefined;
}

// Meta wants phone numbers as digits only, including the country code.
function hashedPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 8) digits = '65' + digits; // bare SG mobile
  return digits ? [sha256(digits)] : undefined;
}

// The first entry of x-forwarded-for is the visitor; the rest are proxies.
function clientIpFrom(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
}

/**
 * Send one event to the Conversions API.
 *
 * `contact` is optional — click events have no form data, and Meta still
 * matches on fbp/fbc/IP/user-agent alone, just less precisely.
 * `eventId` must match the browser Pixel event so Meta counts it once.
 */
async function sendMetaEvent({
  eventName, eventId, eventSourceUrl,
  contact = {}, customData = {},
  fbp, fbc, clientIp, userAgent,
}) {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return { skipped: 'no token' };

  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  const userData = { country: hashed('sg') };

  if (contact.email) userData.em = hashed(contact.email);
  if (contact.phone) userData.ph = hashedPhone(contact.phone);
  if (contact.name) {
    const parts = String(contact.name).trim().split(/\s+/);
    userData.fn = hashed(parts[0]);
    if (parts.length > 1) userData.ln = hashed(parts.slice(1).join(' '));
  }
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const body = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl,
      action_source: 'website',
      user_data: userData,
      custom_data: customData,
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events` +
    `?access_token=${encodeURIComponent(token)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    // Message only, so the token can never land in the logs.
    throw new Error(`Meta CAPI ${resp.status}: ${await resp.text().catch(() => '')}`);
  }
  return resp.json().catch(() => ({}));
}

module.exports = { sendMetaEvent, clientIpFrom };
