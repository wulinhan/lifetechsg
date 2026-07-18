// Vercel serverless function: receives lead form submissions and emails the
// housing-specific No-Reno Smart Home Guide via Resend.
//
// Required environment variables (set in the Vercel project settings):
//   RESEND_API_KEY   - your Resend API key (never commit this to the repo)
// Optional:
//   RESEND_FROM      - verified sender, e.g. "Life Tech SG <guide@lifetechsg.com>"
//                      (defaults to Resend's onboarding sender for testing)
//   LEAD_NOTIFY_TO   - an address to notify about each new lead, e.g. sales@lifetechsg.com

const fs = require('fs');
const path = require('path');

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

const WA_LINK = 'https://wa.me/6597760971?text=' +
  encodeURIComponent("Hi! I downloaded the No-Reno Smart Home Guide and I'd like to book a free demo.");

function firstName(name) {
  return String(name).trim().split(/\s+/)[0];
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
    <p style="font-size:15px;line-height:1.6;">Hi ${firstName(name)},</p>
    <p style="font-size:15px;line-height:1.6;">Thanks for downloading the guide. The <strong>${h.label} edition</strong> is attached, with your
    room-by-room switch map (about <strong>${h.switches} switches and ${h.hubs} hubs</strong> for a home like yours), the neutral wire
    question settled, and what to decide before buying a single light.</p>
    <p style="font-size:15px;line-height:1.6;">When you're ready, here's what a ${h.label.toLowerCase()} setup costs, no renovation required:</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:12px;font-size:14px;">
      ${packagesBlock(h)}
    </table>
    <p style="text-align:center;margin:28px 0 8px;">
      <a href="${WA_LINK}" style="background:#141414;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:99px;display:inline-block;">Book a free, no-obligation demo</a>
    </p>
    <p style="text-align:center;color:#6e6e6e;font-size:13px;margin:0 0 24px;">WhatsApp us at 9776 0971, or just reply to this email.</p>
    <p style="font-size:15px;line-height:1.6;">See the whole system running at our showroom before you spend a dollar. Every package comes
    with app setup, Google or Alexa voice control, and a full first-year warranty.</p>
    <p style="font-size:15px;line-height:1.6;">Mike &amp; the Life Tech SG team</p>
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0 16px;">
    <p style="color:#6e6e6e;font-size:12px;line-height:1.6;margin:0;">
      Life Tech SG &middot; 33 Mohamed Sultan Rd, #02-01, Singapore 238977 (by appointment)<br>
      Satellite showroom: Zenterra Lighting, Blk 259 Jurong East St 24, #01-439<br>
      Tue-Fri 11am-6pm &middot; Sat 11am-4pm &middot; Closed Sun, Mon &amp; PH<br><br>
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

  const { name, email, whatsapp, housing } = req.body || {};
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

  const mail = await send({
    from,
    to: [String(email).trim()],
    reply_to: 'sales@lifetechsg.com',
    subject: `Your No-Reno Smart Home Guide (${h.label}) from Life Tech SG`,
    html: emailHtml(name, h),
    attachments,
  });

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
