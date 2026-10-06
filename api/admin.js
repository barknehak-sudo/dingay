// Admin API. Header x-admin-password must match the ADMIN_PASSWORD env var.
// GET  /api/admin                         → latest orders
// POST /api/admin {id, action:'approve'|'reject', note?}
// GET  /api/admin?pending=1               → only orders waiting for review (cheap; used by the verifier)
// POST /api/admin {id, action:'remove'}   → take a paid record off the public registry
// POST /api/admin {id, action:'mark', what}  → record a follow-up (help_sms, congrats_sms, email, call, *_skip)
// POST /api/admin {id, action:'receipt', receipt:{amount,account,payer,paidAt}} → store what the telebirr receipt says
// POST /api/admin {id, action:'restore'}  → put a removed record back (same number, same links)
// POST /api/admin {create:{slug,to,by,…}} → add a registration by hand (paid another way / gift)
// POST /api/admin {inquiry:id, action:'done'|'new'}
// POST /api/admin {testEmail:'you@x.com'} → sends a sample certificate email through the Gmail setup
// Orders come back with payLink, recordLink and msgs (the SMS/email texts); `auto` says what is sent automatically.
import { kv, getJSON, setJSON, loadOrder, saveOrder, publish, send, sameSecret, limited, ip, newKey, PRODUCTS, OCCASIONS, RECEIVERS, PAY_TO, ethPhone } from './_lib.js';
import { messages, links, followUp, sweep, autoOn, sendTestEmail } from './_notify.js';

const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

// What /office gets: no secret key, plus the customer's links and the ready-made texts.
const view = (o, site) => { Object.assign(o, links(o, site), { msgs: messages(o, site) }); delete o.key; return o; };
const siteOf = (req) => 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'dinguy.xyz');

export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_PASSWORD) return send(res, 503, { error: 'ADMIN_PASSWORD is not set in Vercel.' });
    // Only wrong passwords count toward the lockout, so the verifier can poll freely.
    if (!sameSecret(req.headers['x-admin-password'], process.env.ADMIN_PASSWORD)) {
      if (await limited('adminfail:' + ip(req), 20, 600)) return send(res, 429, { error: 'Too many wrong passwords. Wait 10 minutes.' });
      return send(res, 401, { error: 'Wrong password.' });
    }

    if (req.method === 'GET') await sweep();
    // The verifier (Mac) reports its health about once a minute; /office shows a banner when it's off or stuck.
    if (req.method === 'GET' && req.headers['x-verifier']) {
      let h = {}; try { h = JSON.parse(req.headers['x-verifier']); } catch {}
      await setJSON('verifier', { seen: Date.now(), receipt: ['ok', 'fail'].includes(h.receipt) ? h.receipt : 'unknown', receiptAt: Number(h.receiptAt) || 0, err: String(h.err || '').slice(0, 120) });
    }
    if (req.method === 'GET' && req.query.pending) {
      const ids = await kv('SMEMBERS', 'review');
      const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
      const orders = raw.filter(Boolean).map((r) => view(JSON.parse(r), siteOf(req))).filter((o) => o.status === 'review');
      return send(res, 200, { orders, receivers: RECEIVERS, payTo: PAY_TO });
    }

    if (req.method === 'GET') {
      const ids = await kv('LRANGE', 'orders', 0, 499);
      const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
      // payLink = the customer's private order link, so you can text it to them.
      const orders = raw.filter(Boolean).map((r) => view(JSON.parse(r), siteOf(req)));
      const inReview = orders.filter((o) => o.status === 'review').map((o) => o.id);
      if (inReview.length) await kv('SADD', 'review', ...inReview);
      const qids = await kv('LRANGE', 'inquiries', 0, 199);
      const qraw = qids.length ? await kv('MGET', ...qids.map((i) => 'inq:' + i)) : [];
      const inquiries = qraw.filter(Boolean).map((r) => JSON.parse(r));
      return send(res, 200, { orders, inquiries, receivers: RECEIVERS, payTo: PAY_TO, auto: autoOn(), verifier: await getJSON('verifier') });
    }
    if (req.method === 'POST' && (req.body || {}).testEmail) {
      const to = clean(req.body.testEmail, 120);
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(to)) return send(res, 400, { error: 'Email doesn’t look right.' });
      if (!autoOn().emailReady) return send(res, 400, { error: 'GMAIL_APP_PASSWORD is not set in Vercel (or the site wasn’t redeployed after adding it).' });
      try { return send(res, 200, await sendTestEmail(to)); } catch (e) { return send(res, 502, { error: 'Gmail refused: ' + e.message }); }
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
    if (req.method === 'POST' && (req.body || {}).create) {
      const c = req.body.create, p = PRODUCTS[c.slug];
      const to = clean(c.to, 28), by = clean(c.by, 28);
      if (!p) return send(res, 400, { error: 'Choose a stone.' });
      if (!to || !by) return send(res, 400, { error: 'Fill in who it is for and who it is from.' });
      const digits = String(c.phone || '').replace(/[^\d]/g, ''), pm = /^(?:251|0)?([79]\d{8})$/.exec(digits);
      if (digits && !pm) return send(res, 400, { error: 'Phone number doesn’t look right.' });
      const toPhone = ethPhone(c.toPhone);
      if (String(c.toPhone || '').trim() && !toPhone) return send(res, 400, { error: 'Their phone number doesn’t look right.' });
      const email = clean(c.email, 120);
      if (email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return send(res, 400, { error: 'Email doesn’t look right.' });
      let id;
      for (let i = 0; i < 8 && !id; i++) { const cand = 'DG-' + String(100000 + Math.floor(Math.random() * 900000)); if (await kv('SET', 'lock:' + cand, '1', 'NX')) id = cand; }
      if (!id) return send(res, 503, { error: 'Please try again.' });
      const now = Date.now();
      const o = { id, key: newKey(), slug: c.slug, name: p.name, kind: p.kind, price: p.price, to, by,
        occasion: OCCASIONS.includes(c.occasion) ? c.occasion : '', message: clean(c.message, 140),
        phone: pm ? '0' + pm[1] : null, toPhone, email: email || null, lang: c.lang === 'am' ? 'am' : 'en',
        status: 'paid', manual: true, txn: clean(c.note, 60) || null, createdAt: now, approvedBy: 'admin (manual)', approvedAt: now };
      await saveOrder(o);
      await kv('LPUSH', 'orders', id);
      await kv('LTRIM', 'orders', 0, 999);
      await publish(o);
      const done = await followUp(o.id).catch((e) => (console.error('followUp', e.message), null));
      return send(res, 200, { order: view(done || o, siteOf(req)) });
    }
    if (req.method === 'POST') {
      const { id, action, note } = req.body || {};
      const o = await loadOrder(id);
      if (!o) return send(res, 404, { error: 'Order not found.' });
      // Receipt facts (from the verifier, which can read telebirr from Ethiopia). Approve may carry them too.
      const rc = req.body.receipt;
      if (rc && typeof rc === 'object') {
        const amt = Number(rc.amount);
        if (Number.isFinite(amt) && amt >= 0 && amt < 100000) o.paidAmount = amt;
        if (/^\d{4}$/.test(String(rc.account || ''))) o.paidTo = String(rc.account);
        if (rc.payer) o.payer = String(rc.payer).slice(0, 80);
        if (Number.isFinite(Number(rc.paidAt))) o.paidAt = Number(rc.paidAt);
        o.receiptMissing = rc.missing === true || undefined;
      }
      if (action === 'receipt') {
        if (!rc) return send(res, 400, { error: 'No receipt.' });
      } else if (action === 'mark') {
        const FOLLOW = ['help_sms', 'congrats_sms', 'to_sms', 'email', 'call', 'help_skip', 'congrats_skip', 'to_skip', 'email_skip'];
        if (!FOLLOW.includes(req.body.what)) return send(res, 400, { error: 'Unknown follow-up.' });
        o.follow = { ...(o.follow || {}), [req.body.what]: req.body.undo ? null : Date.now() };
      } else if (action === 'approve') {
        if (o.status !== 'paid') { o.status = 'paid'; o.approvedBy = req.body.by === 'verifier' ? 'verifier' : 'admin'; o.approvedAt = Date.now(); await publish(o); }
      } else if (action === 'reject') {
        if (o.status === 'paid') return send(res, 400, { error: 'Already paid — cannot reject.' });
        o.status = 'rejected'; o.customerNote = String(note || '').slice(0, 300) || null;
      } else if (action === 'remove') {
        if (o.status !== 'paid') return send(res, 400, { error: 'Only paid records are in the public registry.' });
        await kv('DEL', 'reg:' + o.id);
        await kv('LREM', 'recent', 0, o.id);
        o.status = 'removed'; o.removedAt = Date.now();
      } else if (action === 'restore') {
        if (o.status !== 'removed') return send(res, 400, { error: 'Only removed records can be restored.' });
        o.status = 'paid'; o.restoredAt = Date.now();
        await publish(o); // same number, original approval date
      } else return send(res, 400, { error: 'Unknown action.' });
      await saveOrder(o);
      if (o.status !== 'review') await kv('SREM', 'review', o.id);
      const done = action === 'approve' ? await followUp(o.id).catch((e) => (console.error('followUp', e.message), null)) : null;
      return send(res, 200, { order: view(done || o, siteOf(req)) });
    }
    send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
}
