// Admin API. Header x-admin-password must match the ADMIN_PASSWORD env var.
// PARTNER_PASSWORD (optional) opens a read-only view: GET /api/admin only, with customers' private details left out.
// GET  /api/admin                         → latest orders
// POST /api/admin {id, action:'approve'|'reject', note?}
// GET  /api/admin?pending=1               → only orders waiting for review (cheap; used by the verifier)
// POST /api/admin {id, action:'remove'}   → take a paid record off the public registry
// POST /api/admin {id, action:'mark', what}  → record a follow-up (help_sms, congrats_sms, email, call, *_skip)
// POST /api/admin {id, action:'receipt', receipt:{amount,account,payer,paidAt}} → store what the telebirr receipt says
// POST /api/admin {id, action:'resend', what}  → send help_sms / congrats_sms / to_sms again now
// POST /api/admin {id, action:'restore'}  → put a removed record back (same number, same links)
// POST /api/admin {create:{slug,to,by,…}} → add a registration by hand (paid another way / gift)
// POST /api/admin {id, action:'edit', edit:{to,by,occasion,message,phone,toPhone,email,byEmail}} → fix certificate details
// POST /api/admin {baseline:{telebirr, jami}} → restart the money totals from these amounts, counting from now
// POST /api/admin {inquiry:id, action:'done'|'new'}
// POST /api/admin {testEmail:'you@x.com'} → sends a sample certificate email through the Gmail setup
// Orders come back with payLink, recordLink and msgs (the SMS/email texts); `auto` says what is sent automatically.
import { kv, getJSON, setJSON, loadOrder, saveOrder, touch, publish, recordOf, publicRecord, send, sameSecret, limited, ip, newKey, PRODUCTS, OCCASIONS, RECEIVERS, PAY_TO, ethPhone } from './_lib.js';
import { messages, links, followUp, sweep, autoOn, sendTestEmail, smsPaused, resendSMS } from './_notify.js';
import { day as hitDay } from './hit.js';
import { AUDIENCES, audience, startJob, tick, stopJob, getJob, jobView, testSend, optout, optouts, exportRows } from './_broadcast.js';
import crypto from 'node:crypto';

const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

// What /office gets: no secret key, plus the customer's links and the ready-made texts.
const view = (o, site) => { Object.assign(o, links(o, site), { msgs: messages(o, site) }); delete o.key; return o; };
// Money totals start from a checked figure: everything paid before `at` is replaced by these amounts (Birr).
// 15 Oct 2026: telebirr receipts weren't being read while the verifier was paused, so the totals were reset by hand.
const BASELINE = { at: 1792055011000, telebirr: 36955, jami: 89 };
// Partner view: only what the dashboard charts need. No phones, emails, messages, keys, links, SMS texts,
// transaction numbers or payer names; names are first names; buyers are matched by an opaque id instead of the phone.
const first = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const buyerId = (o) => o.phone ? crypto.createHash('sha256').update('dg-partner:' + o.phone + (process.env.PARTNER_PASSWORD || '')).digest('hex').slice(0, 12) : null;
const partnerView = (o) => ({
  id: o.id, slug: o.slug, name: o.name, kind: o.kind, price: o.price, status: o.status, manual: o.manual || undefined, lang: o.lang,
  occasion: o.occasion, to: first(o.to), by: first(o.by), buyer: buyerId(o), txn: o.txn ? '✓' : null,
  createdAt: o.createdAt, submittedAt: o.submittedAt, approvedAt: o.approvedAt, approvedBy: o.approvedBy, paidAt: o.paidAt,
  paidAmount: o.paidAmount, paidTo: o.paidTo, receiptMissing: o.receiptMissing,
  jami: o.jami ? { state: o.jami.state, gateway: o.jami.gateway, mode: o.jami.mode, startedAt: o.jami.startedAt, paidAt: o.jami.paidAt, sandbox: o.jami.sandbox } : undefined,
});
const siteOf = (req) => 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'dinguy.xyz');

export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_PASSWORD) return send(res, 503, { error: 'ADMIN_PASSWORD is not set in Vercel.' });
    // Only wrong passwords count toward the lockout, so the verifier can poll freely.
    const given = req.headers['x-admin-password'];
    const partner = !sameSecret(given, process.env.ADMIN_PASSWORD) && !!process.env.PARTNER_PASSWORD && sameSecret(given, process.env.PARTNER_PASSWORD);
    if (!partner && !sameSecret(given, process.env.ADMIN_PASSWORD)) {
      if (await limited('adminfail:' + ip(req), 20, 600)) return send(res, 429, { error: 'Too many wrong passwords. Wait 10 minutes.' });
      return send(res, 401, { error: 'Wrong password.' });
    }
    // GET /api/admin?export=1&since=<ms> → order rows for the Google Sheet sync (admin only; see tools/google-sheet-sync.gs)
    if (req.method === 'GET' && req.query.export) {
      if (partner) return send(res, 403, { error: 'Export is for the admin password only.' });
      return send(res, 200, await exportRows(Number(req.query.since) || 0, siteOf(req)));
    }
    if (req.method === 'GET' && !partner) await sweep();
    // /office sends back the 'ver' it last saw; if no order or inquiry changed since, skip re-sending all of them.
    const ver = req.method === 'GET' && !req.query.pending ? String((await kv('GET', 'ver')) || 0) : null;
    if (ver && req.query.v === ver) return send(res, 200, { same: true, ver, verifier: partner ? undefined : await getJSON('verifier') });
    if (partner) {
      if (req.method !== 'GET') return send(res, 403, { error: 'Partner view is read-only.' });
      const ids = await kv('LRANGE', 'orders', 0, 499);
      const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
      const orders = raw.filter(Boolean).map((r) => partnerView(JSON.parse(r)));
      const days = Array.from({ length: 14 }, (_, i) => hitDay(Date.now() - (13 - i) * 864e5));
      const [taps, people, ...perDay] = await kv('MGET', 'hits:new:taps', 'hits:new:people', ...days.map((d) => 'hits:new:day:' + d));
      const newHits = { taps: Number(taps) || 0, people: Number(people) || 0, days: days.map((d, i) => ({ d, n: Number(perDay[i]) || 0 })) };
      return send(res, 200, { role: 'partner', ver, orders, newHits, baseline: (await getJSON('baseline')) || BASELINE });
    }

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
      // ?since=<ms>: /office already has the orders — send only the ones changed since then ('upd', kept by saveOrder).
      const now = Date.now(), since = Number(req.query.since) || 0;
      const ids = since ? await kv('ZRANGEBYSCORE', 'upd', String(since), '+inf') : await kv('LRANGE', 'orders', 0, 499);
      const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
      // payLink = the customer's private order link, so you can text it to them.
      const orders = raw.filter(Boolean).map((r) => view(JSON.parse(r), siteOf(req)));
      const inReview = orders.filter((o) => o.status === 'review').map((o) => o.id);
      if (inReview.length) await kv('SADD', 'review', ...inReview);
      const qids = await kv('LRANGE', 'inquiries', 0, 199);
      const qraw = qids.length ? await kv('MGET', ...qids.map((i) => 'inq:' + i)) : [];
      const inquiries = qraw.filter(Boolean).map((r) => JSON.parse(r));
      // "NEW" button interest: people (first tap per phone), taps, and people per day for the last 14 days
      const days = Array.from({ length: 14 }, (_, i) => hitDay(Date.now() - (13 - i) * 864e5));
      const [taps, people, ...perDay] = await kv('MGET', 'hits:new:taps', 'hits:new:people', ...days.map((d) => 'hits:new:day:' + d));
      const newHits = { taps: Number(taps) || 0, people: Number(people) || 0, days: days.map((d, i) => ({ d, n: Number(perDay[i]) || 0 })) };
      return send(res, 200, { role: 'admin', ver, now, partial: !!since, smsPaused: await smsPaused(), bc: jobView(await getJob()), optouts: await optouts(), audiences: AUDIENCES, orders, inquiries, receivers: RECEIVERS, payTo: PAY_TO, auto: autoOn(), verifier: await getJSON('verifier'), newHits, baseline: (await getJSON('baseline')) || BASELINE });
    }
    if (req.method === 'POST' && (req.body || {}).testEmail) {
      const to = clean(req.body.testEmail, 120);
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(to)) return send(res, 400, { error: 'Email doesn’t look right.' });
      if (!autoOn().emailReady) return send(res, 400, { error: 'GMAIL_APP_PASSWORD is not set in Vercel (or the site wasn’t redeployed after adding it).' });
      try { return send(res, 200, await sendTestEmail(to)); } catch (e) { return send(res, 502, { error: 'Gmail refused: ' + e.message }); }
    }
    // Messages to many customers: {bc:{do:'count'|'test'|'start'|'tick'|'stop'|'optout', …}} — see api/_broadcast.js
    if (req.method === 'POST' && (req.body || {}).bc) {
      const b = req.body.bc;
      try {
        // names: each person's {name}/{to}, so /office can count the real SMS parts (Amharic names make an SMS longer).
        if (b.do === 'count') { const l = await audience(b.channel, b.who); return send(res, 200, { count: l.length, names: b.channel === 'sms' ? l.map((p) => [p.name, p.forName]) : undefined }); }
        if (b.do === 'test') return send(res, 200, { to: await testSend(b) });
        if (b.do === 'start') return send(res, 200, { bc: jobView(await startJob(b)) });
        if (b.do === 'tick') return send(res, 200, { bc: jobView(await tick()) });
        if (b.do === 'stop') return send(res, 200, { bc: jobView(await stopJob()) });
        if (b.do === 'optout') return send(res, 200, { optouts: await optout(b.value, b.undo) });
      } catch (e) { return send(res, 400, { error: e.message }); }
      return send(res, 400, { error: 'Unknown.' });
    }
    if (req.method === 'POST' && (req.body || {}).baseline) {
      const b = req.body.baseline, tb = Number(b.telebirr), jm = Number(b.jami);
      if (![tb, jm].every((n) => Number.isFinite(n) && n >= 0 && n < 1e8)) return send(res, 400, { error: 'Amounts don’t look right.' });
      const baseline = { at: Date.now(), telebirr: Math.round(tb * 100) / 100, jami: Math.round(jm * 100) / 100 };
      await setJSON('baseline', baseline);
      return send(res, 200, { baseline });
    }
    if (req.method === 'POST' && (req.body || {}).inquiry) {
      const { inquiry, action } = req.body;
      const q = /^IQ-[A-Z0-9]+$/.test(inquiry) ? await getJSON('inq:' + inquiry) : null;
      if (!q) return send(res, 404, { error: 'Inquiry not found.' });
      if (action !== 'done' && action !== 'new') return send(res, 400, { error: 'Unknown action.' });
      q.status = action;
      await setJSON('inq:' + q.id, q);
      await touch();
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
      const email = clean(c.email, 120), byEmail = clean(c.byEmail, 120);
      if (byEmail && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(byEmail)) return send(res, 400, { error: 'Buyer email doesn’t look right.' });
      if (email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return send(res, 400, { error: 'Email doesn’t look right.' });
      let id;
      for (let i = 0; i < 8 && !id; i++) { const cand = 'DG-' + String(100000 + Math.floor(Math.random() * 900000)); if (await kv('SET', 'lock:' + cand, '1', 'NX')) id = cand; }
      if (!id) return send(res, 503, { error: 'Please try again.' });
      const now = Date.now();
      const o = { id, key: newKey(), slug: c.slug, name: p.name, kind: p.kind, price: p.price, to, by,
        occasion: OCCASIONS.includes(c.occasion) ? c.occasion : '', message: clean(c.message, 140),
        phone: pm ? '0' + pm[1] : null, toPhone, email: email || null, byEmail: byEmail || null, lang: c.lang === 'am' ? 'am' : 'en',
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
      // Retry one SMS now (help_sms, congrats_sms or to_sms) — from a "didn't go through" task.
      if (action === 'resend') {
        try { return send(res, 200, { order: view(await resendSMS(id, req.body.what), siteOf(req)) }); }
        catch (e) { return send(res, 502, { error: 'SMS Ethiopia refused it: ' + e.message }); }
      }
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
      if (action === 'edit') {
        const e = req.body.edit || {};
        const to = clean(e.to, 28), by = clean(e.by, 28);
        if (!to || !by) return send(res, 400, { error: 'Fill in who it is for and who it is from.' });
        const digits = String(e.phone || '').replace(/[^\d]/g, ''), pm = /^(?:251|0)?([79]\d{8})$/.exec(digits);
        if (digits && !pm) return send(res, 400, { error: 'Buyer phone doesn’t look right.' });
        const toPhone = ethPhone(e.toPhone);
        if (String(e.toPhone || '').trim() && !toPhone) return send(res, 400, { error: 'Their phone number doesn’t look right.' });
        const email = clean(e.email, 120), byEmail = clean(e.byEmail, 120);
        if ([email, byEmail].some((x) => x && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(x))) return send(res, 400, { error: 'Email doesn’t look right.' });
        Object.assign(o, { to, by, occasion: OCCASIONS.includes(e.occasion) ? e.occasion : '', message: clean(e.message, 140),
          phone: pm ? '0' + pm[1] : null, toPhone, email: email || null, byEmail: byEmail || null, editedAt: Date.now() });
        // Paid records: update the public registry entry in place (same number, same date, same spot in "recent").
        if (o.status === 'paid') await setJSON('reg:' + o.id, publicRecord(recordOf(o)));
      } else if (action === 'receipt') {
        if (!rc) return send(res, 400, { error: 'No receipt.' });
      } else if (action === 'mark') {
        const FOLLOW = ['help_sms', 'congrats_sms', 'to_sms', 'email', 'buyer_email', 'help_email', 'call', 'help_skip', 'congrats_skip', 'to_skip', 'email_skip'];
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
