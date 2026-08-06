// Vercel serverless function: receives lead form submissions and emails the
// housing-specific No-Reno Smart Home Guide via Resend.
//
// It also reports the lead to Meta via the Conversions API (server-side), which
// is deduplicated against the browser Pixel event by a shared event_id.
//
// Required environment variables (set in the Vercel project settings):
//   RESEND_API_KEY   - your Resend API key (never commit this to the repo)
// Optional:
//   RESEND_FROM      - verified sender, e.g. "Life Tech SG <guide@lifetechsg.com>"
//                      (defaults to Resend's onboarding sender for testing)
//   LEAD_NOTIFY_TO   - an address to notify about each new lead, e.g. sales@lifetechsg.com
//   META_CAPI_ACCESS_TOKEN - Meta Conversions API token. NEVER commit this.
//                            Without it, the Meta reporting is simply skipped.
//   META_PIXEL_ID    - Meta dataset/pixel id (defaults to the LTSG dataset)
//   META_TEST_EVENT_CODE   - set temporarily to see events in Events Manager's
//                            "Test events" tab; remove for production traffic.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOUSING = {
  '3-Room': {
    file: 'no-reno-smart-home-guide-3-room.pdf',
    label: '3-Room',
    switches: 8, hubs: 2, remotes: 3,
    starter: '$888', essential: '$1,088',
  },
  '4-Room': {
    file: 'no-reno-smart-home-guide-4-room.pdf',
    label: '4-Room',
    switches: 10, hubs: 2, remotes: 4,
    starter: '$988', essential: '$1,288',
  },
  '5-Room': {
    file: 'no-reno-smart-home-guide-5-room.pdf',
    label: '5-Room',
    switches: 12, hubs: 2, remotes: 5,
    starter: '$1,088', essential: '$1,388',
  },
  'More': {
    file: 'no-reno-smart-home-guide-multi-storey.pdf',
    label: 'Multi-Storey',
    switches: 25, hubs: 3, remotes: 5,
    starter: null, essential: '$2,799',
  },
};

const WA_LINK = 'https://wa.me/6588547512?text=' +
  encodeURIComponent("Hi! I downloaded the No-Reno Smart Home Guide and I'd like to book a free demo.");

function firstName(name) {
  return String(name).trim().split(/\s+/)[0];
}

// ---- Meta Conversions API -------------------------------------------------
// Meta requires contact details to be normalised (trimmed, lowercased, no
// punctuation) and then SHA-256 hashed. The fbp/fbc browser ids are the
// exception: those are sent as-is.

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

async function reportLeadToMeta({ name, email, whatsapp, housing, meta, clientIp, userAgent }) {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return { skipped: 'no token' };

  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  const parts = String(name).trim().split(/\s+/);

  const userData = {
    em: hashed(email),
    ph: hashedPhone(whatsapp),
    fn: hashed(parts[0]),
    ln: parts.length > 1 ? hashed(parts.slice(1).join(' ')) : undefined,
    country: hashed('sg'),
  };
  // Browser identifiers and request metadata sharpen attribution. Never hashed.
  if (meta.fbp) userData.fbp = meta.fbp;
  if (meta.fbc) userData.fbc = meta.fbc;
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const body = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: meta.event_id, // dedupes against the browser Pixel event
      event_source_url: meta.event_source_url,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        content_name: 'No-Reno Smart Home Guide',
        content_category: housing,
      },
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
    // Log without the token so it never lands in the logs.
    throw new Error(`Meta CAPI ${resp.status}: ${await resp.text().catch(() => '')}`);
  }
  return resp.json().catch(() => ({}));
}

function packagesBlock(h) {
  if (!h.starter) {
    return `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;"><strong>Essential, Multi-Storey House</strong><br>
      <span style="color:#6e6e6e;font-size:13px;">${h.switches} smart switches, ${h.hubs} WiFi hubs, ${h.remotes} smart IR remotes, app config + Google</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:bold;">${h.essential}</td>
    </tr>`;
  }
  return `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;"><strong>Starter</strong><br>
      <span style="color:#6e6e6e;font-size:13px;">${h.switches} smart switches, ${h.hubs} WiFi hubs, app config + Google</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:bold;">${h.starter}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;"><strong>Essential</strong> <span style="background:#141414;color:#fff;font-size:11px;padding:2px 8px;border-radius:99px;">most popular</span><br>
      <span style="color:#6e6e6e;font-size:13px;">${h.switches} switches, ${h.hubs} hubs, ${h.remotes} smart IR remotes, app config + Google</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:bold;">${h.essential}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;"><strong>Premium bundles A-E</strong><br>
      <span style="color:#6e6e6e;font-size:13px;">The complete home: switches, hubs, remotes, master switch, a headline upgrade, and 3 free gifts</span></td>
      <td style="padding:10px 14px;text-align:right;font-weight:bold;">from $1,588</td>
    </tr>`;
}

function emailHtml(name, h) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f6f6;font-family:Roboto,Helvetica,Arial,sans-serif;color:#141414;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f0f0f;color:#fff;border-radius:16px 16px 0 0;padding:26px 28px;">
    <p style="margin:0 0 6px;color:#ffc93a;font-size:12px;letter-spacing:2px;font-weight:bold;">LIFE TECH SG</p>
    <h1 style="margin:0;font-size:24px;">Your No-Reno Smart Home Guide is here</h1>
    <p style="margin:8px 0 0;color:#b5b5b5;font-size:14px;">${h.label} edition &middot; attached as a PDF</p>
  </div>
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:28px;">
    <p style="font-size:15px;line-height:1.6;">Hello ${firstName(name)},</p>
    <p style="font-size:15px;line-height:1.6;">Lovely to have you. Your <strong>${h.label} edition</strong> of the guide is attached — it walks
    your home room by room (about <strong>${h.switches} switches and ${h.hubs} hubs</strong> for a place like yours), settles the neutral
    wire question for good, and flags the one decision to make before you buy a single light.</p>
    <p style="font-size:15px;line-height:1.6;">And when you're curious about numbers, here's what a ${h.label.toLowerCase()} setup costs — no renovation required:</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:12px;font-size:14px;">
      ${packagesBlock(h)}
    </table>
    <p style="text-align:center;margin:28px 0 8px;">
      <a href="${WA_LINK}" style="background:#141414;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:99px;display:inline-block;">Book a free, no-obligation demo</a>
    </p>
    <p style="text-align:center;color:#6e6e6e;font-size:13px;margin:0 0 24px;">WhatsApp us at 8854 7512, or just reply to this email.</p>
    <p style="font-size:15px;line-height:1.6;">See the whole system running at our showroom before you spend a dollar. Every package comes
    with app setup, Google or Alexa voice control, and a full first-year warranty.</p>
    <p style="font-size:15px;line-height:1.6;">Mike &amp; the Life Tech SG team</p>
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0 16px;">
    <p style="color:#6e6e6e;font-size:12px;line-height:1.6;margin:0;">
      Life Tech SG &middot; 33 Mohamed Sultan Rd, #02-01, Singapore 238977 (by appointment)<br>
      Satellite showroom: Zenterra Lighting, Blk 259 Jurong East St 24, #01-439<br>
      Tue-Fri 11am-6pm &middot; Sat 11am-4pm &middot; Closed Sun, Mon &amp; PH<br>
      <strong>Appointment required — please arrange a time with us before you visit.</strong><br><br>
      You're receiving this because you requested the guide at lifetechsg.com. No spam; reply "unsubscribe" and we'll remove you.
    </p>
  </div>
</div>
</body></html>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, email, whatsapp, housing, meta } = req.body || {};
  const phoneOk = /^(?:\+?65)?[89]\d{7}$/.test(String(whatsapp || '').replace(/[\s-]/g, ''));
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
  const h = HOUSING[housing];
  if (!name || String(name).trim().length < 2 || !emailOk || !phoneOk || !h) {
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Email delivery not configured' });
    return;
  }
  const from = process.env.RESEND_FROM || 'Life Tech SG <onboarding@resend.dev>';

  let attachments = [];
  try {
    const pdf = fs.readFileSync(path.join(process.cwd(), 'assets', 'guides', h.file));
    attachments = [{ filename: h.file, content: pdf.toString('base64') }];
  } catch (e) {
    // Guide file missing from the bundle: still send the email without it.
  }

  const send = (payload) => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Report the lead to Meta alongside the email. Awaited below (before any
  // response) so the serverless runtime can't freeze mid-request, but its
  // failures are swallowed: ad reporting must never break the guide delivery.
  const metaReport = reportLeadToMeta({
    name, email, whatsapp,
    housing: h.label,
    meta: meta || {},
    clientIp: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    userAgent: req.headers['user-agent'],
  }).catch((err) => { console.error('Meta CAPI error:', err.message); });

  const mail = await send({
    from,
    to: [String(email).trim()],
    reply_to: 'sales@lifetechsg.com',
    subject: `Your No-Reno Smart Home Guide (${h.label}) from Life Tech SG`,
    html: emailHtml(name, h),
    attachments,
  });

  await metaReport;

  if (!mail.ok) {
    const detail = await mail.text().catch(() => '');
    console.error('Resend error:', mail.status, detail);
    res.status(502).json({ error: 'Email send failed' });
    return;
  }

  // Optional internal notification about the new lead.
  if (process.env.LEAD_NOTIFY_TO) {
    send({
      from,
      to: [process.env.LEAD_NOTIFY_TO],
      subject: `New guide lead: ${String(name).trim()} (${h.label})`,
      html: `<p>New lead from the landing page guide form:</p>
        <ul>
          <li><strong>Name:</strong> ${String(name).trim()}</li>
          <li><strong>Email:</strong> ${String(email).trim()}</li>
          <li><strong>WhatsApp:</strong> ${String(whatsapp).replace(/[\s-]/g, '')}</li>
          <li><strong>Housing:</strong> ${h.label}</li>
        </ul>`,
    }).catch(() => {});
  }

  res.status(200).json({ ok: true });
};
