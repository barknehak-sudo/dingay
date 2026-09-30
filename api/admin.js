// Admin API. Header x-admin-password must match the ADMIN_PASSWORD env var.
// GET  /api/admin                         → latest orders
// POST /api/admin {id, action:'approve'|'reject', note?}
// POST /api/admin {inquiry:id, action:'done'|'new'}
import { kv, getJSON, setJSON, loadOrder, saveOrder, publish, send, sameSecret, limited, ip } from './_lib.js';

export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_PASSWORD) return send(res, 503, { error: 'ADMIN_PASSWORD is not set in Vercel.' });
    if (await limited('admin:' + ip(req), 60, 600)) return send(res, 429, { error: 'Slow down.' });
    if (!sameSecret(req.headers['x-admin-password'], process.env.ADMIN_PASSWORD)) return send(res, 401, { error: 'Wrong password.' });

    if (req.method === 'GET') {
      const ids = await kv('LRANGE', 'orders', 0, 199);
      const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
      const orders = raw.filter(Boolean).map((r) => { const o = JSON.parse(r); delete o.key; return o; });
      const qids = await kv('LRANGE', 'inquiries', 0, 199);
      const qraw = qids.length ? await kv('MGET', ...qids.map((i) => 'inq:' + i)) : [];
      const inquiries = qraw.filter(Boolean).map((r) => JSON.parse(r));
      return send(res, 200, { orders, inquiries });
    }
    if (req.method === 'POST' && (req.body || {}).inquiry) {
      const { inquiry, action } = req.body;
      const q = /^IQ-[A-Z0-9]+$/.test(inquiry) ? await getJSON('inq:' + inquiry) : null;
      if (!q) return send(res, 404, { error: 'Inquiry not found.' });
      if (action !== 'done' && action !== 'new') return send(res, 400, { error: 'Unknown action.' });
      q.status = action;
      await setJSON('inq:' + q.id, q);
      return send(res, 200, { inquiry: q });
    }
    if (req.method === 'POST') {
      const { id, action, note } = req.body || {};
      const o = await loadOrder(id);
      if (!o) return send(res, 404, { error: 'Order not found.' });
      if (action === 'approve') {
        if (o.status !== 'paid') { o.status = 'paid'; o.approvedBy = 'admin'; o.approvedAt = Date.now(); await publish(o); }
      } else if (action === 'reject') {
        if (o.status === 'paid') return send(res, 400, { error: 'Already paid — cannot reject.' });
        o.status = 'rejected'; o.customerNote = String(note || '').slice(0, 200) || null;
      } else return send(res, 400, { error: 'Unknown action.' });
      await saveOrder(o);
      delete o.key;
      return send(res, 200, { order: o });
    }
    send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
}
