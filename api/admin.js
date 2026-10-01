// Admin API. Header x-admin-password must match the ADMIN_PASSWORD env var.
// GET  /api/admin                         → latest orders
// POST /api/admin {id, action:'approve'|'reject', note?}
// GET  /api/admin?pending=1               → only orders waiting for review (cheap; used by the verifier)
// POST /api/admin {id, action:'remove'}   → take a paid record off the public registry
// POST /api/admin {inquiry:id, action:'done'|'new'}
import { kv, getJSON, setJSON, loadOrder, saveOrder, publish, send, sameSecret, limited, ip, RECEIVERS, PAY_TO } from './_lib.js';

const strip = (o) => { delete o.key; return o; };

export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_PASSWORD) return send(res, 503, { error: 'ADMIN_PASSWORD is not set in Vercel.' });
    // Only wrong passwords count toward the lockout, so the verifier can poll freely.
    if (!sameSecret(req.headers['x-admin-password'], process.env.ADMIN_PASSWORD)) {
      if (await limited('adminfail:' + ip(req), 20, 600)) return send(res, 429, { error: 'Too many wrong passwords. Wait 10 minutes.' });
      return send(res, 401, { error: 'Wrong password.' });
    }

    if (req.method === 'GET' && req.query.pending) {
      const ids = await kv('SMEMBERS', 'review');
      const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
      const orders = raw.filter(Boolean).map((r) => strip(JSON.parse(r))).filter((o) => o.status === 'review');
      return send(res, 200, { orders, receivers: RECEIVERS, payTo: PAY_TO });
    }

    if (req.method === 'GET') {
      const ids = await kv('LRANGE', 'orders', 0, 199);
      const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
      const site = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'dinguy.xyz');
      // payLink = the customer's private order link, so you can text it to them.
      const orders = raw.filter(Boolean).map((r) => { const o = JSON.parse(r); o.payLink = `${site}/#/pay/${o.id}/${o.key}`; o.recordLink = `${site}/#/registry/${o.id}`; return strip(o); });
      const inReview = orders.filter((o) => o.status === 'review').map((o) => o.id);
      if (inReview.length) await kv('SADD', 'review', ...inReview);
      const qids = await kv('LRANGE', 'inquiries', 0, 199);
      const qraw = qids.length ? await kv('MGET', ...qids.map((i) => 'inq:' + i)) : [];
      const inquiries = qraw.filter(Boolean).map((r) => JSON.parse(r));
      return send(res, 200, { orders, inquiries, receivers: RECEIVERS, payTo: PAY_TO });
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
        if (o.status !== 'paid') { o.status = 'paid'; o.approvedBy = req.body.by === 'verifier' ? 'verifier' : 'admin'; o.approvedAt = Date.now(); await publish(o); }
      } else if (action === 'reject') {
        if (o.status === 'paid') return send(res, 400, { error: 'Already paid — cannot reject.' });
        o.status = 'rejected'; o.customerNote = String(note || '').slice(0, 300) || null;
      } else if (action === 'remove') {
        if (o.status !== 'paid') return send(res, 400, { error: 'Only paid records are in the public registry.' });
        await kv('DEL', 'reg:' + o.id);
        await kv('LREM', 'recent', 0, o.id);
        o.status = 'removed'; o.removedAt = Date.now();
      } else return send(res, 400, { error: 'Unknown action.' });
      await saveOrder(o);
      await kv('SREM', 'review', o.id);
      delete o.key;
      return send(res, 200, { order: o });
    }
    send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
}
