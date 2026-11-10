// Vercel serverless function: receives the partner form and emails it via Resend.
// Required env var: RESEND_API_KEY
// Optional env vars: TO_EMAIL (default kris.tonas@myome.com), FROM_EMAIL (default "MyOme Partnerships <onboarding@resend.dev>")

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { clinicName: 200, contactName: 200, phone: 40, email: 200, patientsPerMonth: 10, deployment: 4000 };

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function validate(body) {
  const d = {};
  for (const k of Object.keys(LIMITS)) d[k] = clean(body[k], LIMITS[k]);
  const errors = [];
  if (!d.clinicName) errors.push('clinic name');
  if (!d.contactName) errors.push('contact name');
  if (d.phone.replace(/\D/g, '').length < 7) errors.push('phone');
  if (!EMAIL_RE.test(d.email)) errors.push('email');
  if (!/^\d+$/.test(d.patientsPerMonth)) errors.push('patients per month');
  if (!d.deployment) errors.push('how you expect to offer MyOme');
  return { d, errors };
}

function buildEmail(d) {
  const rows = [
    ['Clinic name', d.clinicName],
    ['Main contact', d.contactName],
    ['Phone', d.phone],
    ['Email', d.email],
    ['Expected patients per month', d.patientsPerMonth],
    ['How they expect to offer MyOme', d.deployment],
  ];
  const html = `<div style="font-family:Arial,sans-serif;color:#1F2A44;max-width:620px">
<h2 style="color:#003595;margin:0 0 12px">New MyOme partnership inquiry</h2>
<table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) =>
    `<tr><td style="padding:8px 10px;border-bottom:1px solid #D6E5F2;font-weight:bold;vertical-align:top;width:40%">${esc(k)}</td><td style="padding:8px 10px;border-bottom:1px solid #D6E5F2;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}
</table><p style="font-size:12px;color:#6B7387;margin-top:14px">Reply to this email to respond directly to ${esc(d.contactName)}.</p></div>`;
  const text = 'New MyOme partnership inquiry\n\n' + rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  return { html, text };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed.' }));
  }

  const body = await readBody(req);
  if (!body) return res.status(400).end(JSON.stringify({ error: 'Invalid request.' }));

  // Honeypot: bots fill the hidden "website" field. Pretend success, send nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(200).end(JSON.stringify({ ok: true }));
  }

  const { d, errors } = validate(body);
  if (errors.length) {
    return res.status(400).end(JSON.stringify({ error: 'Please check: ' + errors.join(', ') + '.' }));
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).end(JSON.stringify({ error: 'The form is not configured yet.' }));
  }

  const { html, text } = buildEmail(d);
  try {
    const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'MyOme Partnerships <onboarding@resend.dev>',
        to: [process.env.TO_EMAIL || 'kris.tonas@myome.com'],
        reply_to: d.email,
        subject: `New partnership inquiry: ${d.clinicName}`,
        html,
        text,
      }),
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text());
      return res.status(502).end(JSON.stringify({ error: 'We could not send your submission.' }));
    }
    return res.status(200).end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error('Send failed', e);
    return res.status(502).end(JSON.stringify({ error: 'We could not send your submission.' }));
  }
};

module.exports._internal = { validate, buildEmail, esc };
