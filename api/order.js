// POST /api/order — create an order that is waiting for payment.
import { PRODUCTS, OCCASIONS, kv, saveOrder, send, ip, limited, newKey } from './_lib.js';

const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    if (await limited('order:' + ip(req), 20, 3600)) return send(res, 429, { error: 'Too many orders from this connection. Try again later.' });
    const b = req.body || {};
    const p = PRODUCTS[b.slug];
    const to = clean(b.to, 28), by = clean(b.by, 28), message = clean(b.message, 140);
    const occasion = OCCASIONS.includes(b.occasion) ? b.occasion : '';
    if (!p) return send(res, 400, { error: 'Unknown Dinguy.' });
    if (!to || !by) return send(res, 400, { error: 'Add a recipient and your name.' });
    // Buyer's phone (Ethiopian mobile) — stored as 09XXXXXXXX / 07XXXXXXXX.
    const digits = String(b.phone || '').replace(/[^\d]/g, '');
    const m = /^(?:251|0)?([79]\d{8})$/.exec(digits);
    if (!m) return send(res, 400, { error: 'Add your phone number to continue.' });
    const phone = '0' + m[1];
    const email = clean(b.email, 120);
    if (email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return send(res, 400, { error: 'Check the email address.' });
    const lang = b.lang === 'am' ? 'am' : 'en';

    let id;
    for (let i = 0; i < 8 && !id; i++) {
      const cand = 'DG-' + String(100000 + Math.floor(Math.random() * 900000));
      if (await kv('SET', 'lock:' + cand, '1', 'NX')) id = cand;
    }
    if (!id) return send(res, 503, { error: 'Please try again.' });

    const o = { id, key: newKey(), slug: b.slug, name: p.name, kind: p.kind, price: p.price, to, by, occasion, message, phone, email: email || null, lang, status: 'awaiting', createdAt: Date.now() };
    await saveOrder(o);
    await kv('LPUSH', 'orders', id);
    await kv('LTRIM', 'orders', 0, 999);
    send(res, 200, { id, key: o.key });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}
