// DINGUY auto-verifier — run this on any computer/phone that is on Ethiopian internet
// (Ethio Telecom's receipt service blocks foreign servers, so Vercel can't do this itself).
//
// Every 10 s it asks the site for orders waiting for review, opens each telebirr receipt,
// and approves the ones that are genuinely paid to you. Anything that doesn't match is left
// for you to handle on the admin page.
//
// Run:   DINGUY_ADMIN_PASSWORD='…' node verifier/verify.mjs
//   or on a Mac, store the password once in Keychain (service "dingay-admin") — see verifier/install-mac.sh.
// Needs: Node 20+.  Optional: DINGUY_SITE (default https://dingay.vercel.app)
import { execFileSync } from 'node:child_process';
import { parseReceipt, parseEAT, receiverCheck, fetchReceipt as fetchOnce } from '../api/_lib.js';

// Ethio Telecom's receipt site is patchy: give it up to 25 s and two quick retries before calling it a failure.
async function fetchReceipt(txn) {
  let err;
  for (let i = 0; i < 3; i++) {
    try { return await fetchOnce(txn, 25000); } catch (e) { err = e; await new Promise((r) => setTimeout(r, 1500)); }
  }
  throw err;
}

const SITE = process.env.DINGUY_SITE || 'https://dingay.vercel.app';
function password() {
  if (process.env.DINGUY_ADMIN_PASSWORD) return process.env.DINGUY_ADMIN_PASSWORD;
  try { return execFileSync('/usr/bin/security', ['find-generic-password', '-s', 'dingay-admin', '-w'], { encoding: 'utf8' }).trim(); } catch { return ''; }
}
const PW = password();
if (!PW) { console.error('No admin password: set DINGUY_ADMIN_PASSWORD or add Keychain item "dingay-admin"'); process.exit(1); }
const fmtPhone = (p) => String(p || '').replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
let receivers = null; // which accounts count as ours — always taken from the site, so it's one setting
const skipUntil = new Map(); // txn -> time to re-check a receipt that didn't match

let first = true; // first poll reads everything (and re-queues anything waiting); later polls only the pending list
// Health report for the /office banner: sent with a poll about once a minute.
const health = { receipt: 'unknown', receiptAt: 0, err: '' };
let lastReport = 0;
function receiptResult(ok, err) { Object.assign(health, { receipt: ok ? 'ok' : 'fail', receiptAt: Date.now(), err: ok ? '' : String(err || '').slice(0, 120) }); }
async function admin(method, body, query = '') {
  const headers = { 'x-admin-password': PW, 'content-type': 'application/json' };
  if (method === 'GET' && Date.now() - lastReport > 60e3) { headers['x-verifier'] = JSON.stringify(health); lastReport = Date.now(); }
  // The connection to the site also drops now and then — retry twice before giving up on this round.
  let r;
  for (let i = 0; ; i++) {
    try { r = await fetch(SITE + '/api/admin' + query, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) }); break; }
    catch (e) { if (i >= 2) throw e; await new Promise((res) => setTimeout(res, 2000)); }
  }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}

// Returns { approve } | { reject: note for the customer } | { problems: [...] for you to decide }
async function check(o, payTo) {
  let html;
  try { html = await fetchReceipt(o.txn); receiptResult(true); } catch (e) { receiptResult(false, e.message); throw e; }
  const r = parseReceipt(html, o.txn);
  if (!r.found) {
    // Only treat it as a typo when telebirr explicitly says the transaction doesn't exist.
    if (/request is not correct/i.test(html)) return { reject: `We couldn't find telebirr transaction ${o.txn}. Check the transaction number in your telebirr SMS and enter it again.` };
    return { problems: ['receipt page looked unusual'] };
  }
  const rc = receiverCheck(r, receivers || undefined);
  if (rc === 'no') return { reject: `Transaction ${o.txn} wasn't sent to DINGUY. Send ${o.price} Birr to ${fmtPhone(payTo.phone)}${payTo.name ? ` (${payTo.name})` : ''} and enter the new transaction number.` };
  const paidAt = parseEAT(r.date);
  const problems = [];
  if (rc === 'unknown') problems.push(`paid to "${r.receiver}" (${r.account}) — right number, unexpected name; check it's your account`);
  if (!/completed/i.test(r.status)) problems.push('not completed');
  if (!(r.amount >= o.price)) problems.push(`paid ${r.amount}, price ${o.price}`);
  if (!paidAt || paidAt < o.createdAt - 15 * 60e3) problems.push('payment older than order');
  const receipt = { amount: r.amount, account: String(r.account).replace(/\D/g, '').slice(-4), payer: r.payer, paidAt };
  return problems.length ? { problems } : { approve: true, receipt };
}

// Once per start: read the real amount + receiving account for paid orders that don't have them yet.
async function backfill(orders) {
  const todo = orders.filter((o) => (o.status === 'paid' || o.status === 'removed') && o.txn && !o.manual && o.paidAmount == null);
  let missing = 0;
  let n = 0;
  for (const o of todo) {
    try {
      const html = await fetchReceipt(o.txn);
      const r = parseReceipt(html, o.txn);
      if (!r.found) {
        // telebirr says this transaction doesn't exist → no money came in for it
        if (/request is not correct/i.test(html)) { await admin('POST', { id: o.id, action: 'receipt', receipt: { amount: 0, missing: true } }); missing++; }
        continue;
      }
      await admin('POST', { id: o.id, action: 'receipt', receipt: { amount: r.amount, account: String(r.account).replace(/\D/g, '').slice(-4), payer: r.payer, paidAt: parseEAT(r.date) } });
      n++;
    } catch (e) { /* try again next start */ }
  }
  if (todo.length) console.log(new Date().toISOString(), `backfilled receipts for ${n}/${todo.length} paid orders; ${missing} have no telebirr receipt`);
}

// When nothing is waiting, still check every 5 minutes that telebirr's receipt site answers.
let lastProbe = 0;
async function probe() {
  if (Date.now() - lastProbe < 5 * 60e3) return;
  lastProbe = Date.now();
  try { await fetchReceipt('DJ00000000'); receiptResult(true); } catch (e) { receiptResult(false, e.message); }
}

async function tick() {
  const j = await admin('GET', null, first ? '' : '?pending=1');
  if (first) backfill(j.orders).catch((e) => console.log(new Date().toISOString(), 'backfill error', e.message));
  first = false;
  if (j.receivers) receivers = j.receivers;
  const payTo = j.payTo || {};
  const orders = j.orders;
  if (!orders.some((x) => x.status === 'review' && x.txn)) await probe();
  for (const o of orders.filter((x) => x.status === 'review' && x.txn)) {
    if ((skipUntil.get(o.txn) || 0) > Date.now()) continue;
    try {
      const v = await check(o, payTo);
      if (v.approve) {
        await admin('POST', { id: o.id, action: 'approve', by: 'verifier', receipt: v.receipt });
        console.log(new Date().toISOString(), 'APPROVED', o.id, o.txn);
      } else if (v.reject) {
        await admin('POST', { id: o.id, action: 'reject', note: v.reject });
        console.log(new Date().toISOString(), 'REJECTED', o.id, o.txn, '—', v.reject);
      } else {
        skipUntil.set(o.txn, Date.now() + 10 * 60e3);
        console.log(new Date().toISOString(), 'needs you', o.id, o.txn, '—', v.problems.join('; '));
      }
    } catch (e) {
      console.log(new Date().toISOString(), 'could not check', o.id, e.message);
    }
  }
}

console.log('DINGUY verifier watching', SITE);
for (;;) {
  try { await tick(); } catch (e) { console.log(new Date().toISOString(), 'error', e.message); }
  await new Promise((r) => setTimeout(r, 10000));
}
