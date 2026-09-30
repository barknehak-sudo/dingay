// DINGAY auto-verifier — run this on any computer/phone that is on Ethiopian internet
// (Ethio Telecom's receipt service blocks foreign servers, so Vercel can't do this itself).
//
// Every 30 s it asks the site for orders waiting for review, opens each telebirr receipt,
// and approves the ones that are genuinely paid to you. Anything that doesn't match is left
// for you to handle on /admin.html.
//
// Run:   DINGAY_ADMIN_PASSWORD='…' node verifier/verify.mjs
// Needs: Node 20+.  Optional: DINGAY_SITE (default https://dingay.vercel.app)
import { parseReceipt, parseEAT, receiverOk, fetchReceipt } from '../api/_lib.js';

const SITE = process.env.DINGAY_SITE || 'https://dingay.vercel.app';
const PW = process.env.DINGAY_ADMIN_PASSWORD;
if (!PW) { console.error('Set DINGAY_ADMIN_PASSWORD'); process.exit(1); }
const skipUntil = new Map(); // txn -> time to re-check a receipt that didn't match

async function admin(method, body) {
  const r = await fetch(SITE + '/api/admin', { method, headers: { 'x-admin-password': PW, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}

async function check(o) {
  const html = await fetchReceipt(o.txn);
  const r = parseReceipt(html, o.txn);
  const paidAt = parseEAT(r.date);
  const problems = [];
  if (!r.found) problems.push('receipt not found');
  else {
    if (!/completed/i.test(r.status)) problems.push('not completed');
    if (!receiverOk(r)) problems.push('paid to someone else: ' + r.receiver);
    if (!(r.amount >= o.price)) problems.push(`paid ${r.amount}, price ${o.price}`);
    if (!paidAt || paidAt < o.createdAt - 15 * 60e3) problems.push('payment older than order');
  }
  return problems;
}

async function tick() {
  const { orders } = await admin('GET');
  for (const o of orders.filter((x) => x.status === 'review' && x.txn)) {
    if ((skipUntil.get(o.txn) || 0) > Date.now()) continue;
    try {
      const problems = await check(o);
      if (!problems.length) {
        await admin('POST', { id: o.id, action: 'approve' });
        console.log(new Date().toISOString(), 'APPROVED', o.id, o.txn);
      } else {
        skipUntil.set(o.txn, Date.now() + 10 * 60e3);
        console.log(new Date().toISOString(), 'needs you', o.id, o.txn, '—', problems.join('; '));
      }
    } catch (e) {
      console.log(new Date().toISOString(), 'could not check', o.id, e.message);
    }
  }
}

console.log('DINGAY verifier watching', SITE);
for (;;) {
  try { await tick(); } catch (e) { console.log(new Date().toISOString(), 'error', e.message); }
  await new Promise((r) => setTimeout(r, 30000));
}
