// POST /api/pay-jami {id, key, gateway} — start a JamiDev payment: Telebirr / M-Pesa / CBE Birr pushes a
// request to the buyer's phone (production) or opens Jami's test simulator (sandbox).
import { loadOrder, saveOrder, publicOrder, send, limited, ip } from './_lib.js';
import { startJami, jamiOn, jamiSandbox, GATEWAYS } from './_jami.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    if (!jamiOn()) return send(res, 503, { error: 'Online payment isn’t switched on yet. Please pay with the telebirr code.' });
    const { id, key } = req.body || {};
    const gateway = GATEWAYS.includes((req.body || {}).gateway) ? req.body.gateway : 'telebirr';
    const o = await loadOrder(id);
    if (!o || o.key !== key) return send(res, 404, { error: 'Order not found.' });
    if (o.status !== 'awaiting' && o.status !== 'rejected') return send(res, 200, { order: publicOrder(o) });
    if (await limited('payjami:' + ip(req), 15, 300)) return send(res, 429, { error: 'Too many tries. Wait a few minutes.' });
    const site = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'dinguy.xyz');
    const j = await startJami(o, gateway, site);
    o.jami = { sessionId: j.sessionId, mode: j.mode, gateway, state: 'open', startedAt: Date.now(), sandbox: jamiSandbox() };
    await saveOrder(o);
    send(res, 200, { mode: j.mode, checkoutUrl: j.checkoutUrl, order: publicOrder(o) });
  } catch (e) {
    console.error('pay-jami', e.message);
    send(res, 502, { error: 'We couldn’t start the payment. Check the phone number, or pay with the telebirr code instead.' });
  }
}
