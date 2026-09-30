// DINGAY auto-verifier — run this on any computer/phone that is on Ethiopian internet
// (Ethio Telecom's receipt service blocks foreign servers, so Vercel can't do this itself).
//
// Every 30 s it asks the site for orders waiting for review, opens each telebirr receipt,
// and approves the ones that are genuinely paid to you. Anything that doesn't match is left
// for you to handle on /admin.html.
//
// Run:   DINGAY_ADMIN_PASSWORD='…' node verifier/verify.mjs
//   or on a Mac, store the password once in Keychain (service "dingay-admin") — see verifier/install-mac.sh.
// Needs: Node 20+.  Optional: DINGAY_SITE (default https://dingay.vercel.app)
import { execFileSync } from 'node:child_process';
import { parseReceipt, parseEAT, receiverOk, fetchReceipt, PAY_TO } from '../api/_lib.js';

const SITE = process.env.DINGAY_SITE || 'https://dingay.vercel.app';
function password() {
  if (process.env.DINGAY_ADMIN_PASSWORD) return process.env.DINGAY_ADMIN_PASSWORD;
  try { return execFileSync('/usr/bin/security', ['find-generic-password', '-s', 'dingay-admin', '-w'], { encoding: 'utf8' }).trim(); } catch { return ''; }
}
const PW = password();
if (!PW) { console.error('No admin password: set DINGAY_ADMIN_PASSWORD or add Keychain item "dingay-admin"'); process.exit(1); }
const phoneFmt = PAY_TO.phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
const skipUntil = new Map(); // txn -> time to re-check a receipt that didn't match

async function admin(method, body) {
  const r = await fetch(SITE + '/api/admin', { method, headers: { 'x-admin-password': PW, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}

// Returns { approve } | { reject: note for the customer } | { problems: [...] for you to decide }
async function check(o) {
  const html = await fetchReceipt(o.txn);
  const r = parseReceipt(html, o.txn);
  if (!r.found) {
    // Only treat it as a typo when telebirr explicitly says the transaction doesn't exist.
    if (/request is not correct/i.test(html)) return { reject: `We couldn't find telebirr transaction ${o.txn}. Check the transaction number in your telebirr SMS and enter it again.` };
    return { problems: ['receipt page looked unusual'] };
  }
  if (!receiverOk(r)) return { reject: `Transaction ${o.txn} wasn't sent to DINGAY. Send ${o.price} Birr to ${phoneFmt} (${PAY_TO.name}) and enter the new transaction number.` };
  const paidAt = parseEAT(r.date);
  const problems = [];
  if (!/completed/i.test(r.status)) problems.push('not completed');
  if (!(r.amount >= o.price)) problems.push(`paid ${r.amount}, price ${o.price}`);
  if (!paidAt || paidAt < o.createdAt - 15 * 60e3) problems.push('payment older than order');
  return problems.length ? { problems } : { approve: true };
}

async function tick() {
  const { orders } = await admin('GET');
  for (const o of orders.filter((x) => x.status === 'review' && x.txn)) {
    if ((skipUntil.get(o.txn) || 0) > Date.now()) continue;
    try {
      const v = await check(o);
      if (v.approve) {
        await admin('POST', { id: o.id, action: 'approve' });
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

console.log('DINGAY verifier watching', SITE);
for (;;) {
  try { await tick(); } catch (e) { console.log(new Date().toISOString(), 'error', e.message); }
  await new Promise((r) => setTimeout(r, 30000));
}
