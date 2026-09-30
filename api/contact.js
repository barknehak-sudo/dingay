// POST /api/contact — SIDEWAYS "start a project" inquiries, read in admin.html.
import crypto from 'node:crypto';
import { kv, setJSON, send, ip, limited } from './_lib.js';

const clean = (s, max) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').trim().slice(0, max);
const NEEDS = ['Website', 'Guerrilla marketing', 'Something unusual'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    if (await limited('contact:' + ip(req), 8, 3600)) return send(res, 429, { error: 'Too many messages. Please call or email us instead.' });
    const b = req.body || {};
    const name = clean(b.name, 80), reach = clean(b.reach, 120), msg = clean(b.msg, 2000);
    const need = NEEDS.includes(b.need) ? b.need : 'Something unusual';
    if (!name || !reach) return send(res, 400, { error: 'Add your name and a phone number or email.' });
    const id = 'IQ-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
    await setJSON('inq:' + id, { id, name, reach, need, msg, status: 'new', createdAt: Date.now() });
    await kv('LPUSH', 'inquiries', id);
    await kv('LTRIM', 'inquiries', 0, 499);
    send(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong. Please call or email us instead.' });
  }
}
