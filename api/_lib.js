// Shared helpers for the DINGUY payment API (Vercel Node functions, no dependencies).
import crypto from 'node:crypto';

export const PRODUCTS = {
  'cobblestone': { name: 'COBBLESTONE', kind: 'cobble', price: 89 },
  'bloket': { name: 'ብሎኬት', kind: 'blocket', price: 89 },
  'river-stone': { name: 'የወንዝ ድንጋይ', kind: 'river', price: 89 },
  'foundation-stone': { name: 'መሰረት ድንጋይ', kind: 'foundation', price: 89 },
  'queen-of-sheba': { name: 'THE QUEEN OF SHEBA', kind: 'opal', price: 199 },
  'mezezo-chocolate-opal': { name: 'MEZEZO CHOCOLATE OPAL', kind: 'choc', price: 199 },
  'shakiso-emerald': { name: 'SHAKISO EMERALD', kind: 'emerald', price: 199 },
  'diamond': { name: 'DIAMOND', kind: 'diamond', price: 199 },
};
export const OCCASIONS = ['Birthday', 'Anniversary', 'Graduation', 'Farewell', 'Apology', 'Just because'];

// Where customers send money (shown on the pay page). Override with Vercel env vars PAY_PHONE / RECEIVER_NAME.
export const PAY_TO = {
  phone: process.env.PAY_PHONE || '0996567218',
  name: process.env.RECEIVER_NAME || '',
};
// Accounts a receipt may be credited to: the current number, plus the old one so earlier payments still verify.
// A receiver with an empty name can't be auto-approved — those payments go to manual review instead.
export const RECEIVERS = [
  { name: PAY_TO.name, last4: PAY_TO.phone.slice(-4) },
  { name: 'Din Mohammed Sherif', last4: '5467' },
];
const RECEIPT_URL = 'https://transactioninfo.ethiotelecom.et/receipt/';

/* ---------- Upstash Redis over REST ---------- */
export async function kv(...cmd) {
  const r = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error('kv: ' + j.error);
  return j.result;
}
export const getJSON = async (k) => { const v = await kv('GET', k); return v ? JSON.parse(v) : null; };
export const setJSON = (k, v) => kv('SET', k, JSON.stringify(v));
export const saveOrder = (o) => setJSON('order:' + o.id, o);
export const loadOrder = (id) => (/^DG-\d{6}$/.test(id || '') ? getJSON('order:' + id) : null);

/* ---------- http ---------- */
export function send(res, code, obj) {
  res.setHeader('cache-control', 'no-store');
  res.status(code).json(obj);
}
export function ip(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}
// Fixed-window limiter: at most `max` hits per `sec` seconds for this key.
export async function limited(key, max, sec) {
  const n = await kv('INCR', 'rl:' + key);
  if (n === 1) await kv('EXPIRE', 'rl:' + key, sec);
  return n > max;
}
export const newKey = () => crypto.randomBytes(16).toString('hex');
export function sameSecret(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

/* ---------- registry ---------- */
const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Addis_Ababa' });
export function recordOf(o) {
  return { no: o.id, to: o.to, by: o.by, type: o.name, occasion: o.occasion || '—', message: o.message, kind: o.kind, slug: o.slug, date: fmtDate(o.approvedAt || Date.now()), ts: o.approvedAt || Date.now() };
}
export async function publish(o) {
  await setJSON('reg:' + o.id, recordOf(o));
  await kv('LPUSH', 'recent', o.id);
  await kv('LTRIM', 'recent', 0, 49);
}
// What the customer's browser is allowed to see about its own order.
export function publicOrder(o) {
  return {
    id: o.id, status: o.status, price: o.price, name: o.name, kind: o.kind, slug: o.slug, to: o.to, by: o.by,
    txn: o.txn || null, submittedAt: o.submittedAt || null,
    note: o.status === 'rejected' ? (o.customerNote || 'We could not confirm this payment.') : null,
    payTo: { phone: PAY_TO.phone, name: PAY_TO.name || null },
    reg: o.status === 'paid' ? recordOf(o) : null,
  };
}

/* ---------- telebirr receipt ---------- */
export function parseReceipt(html, txn) {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const toks = text.split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const after = (label) => { const i = toks.findIndex((t) => t.toLowerCase().includes(label)); return i >= 0 ? toks[i + 1] || '' : ''; };
  const i = toks.findIndex((t) => t.toUpperCase() === txn);
  return {
    found: i >= 0,
    payer: after('payer name'),
    receiver: after('credited party name'),
    account: after('credited party account no'),
    status: after('transaction status'),
    date: i >= 0 ? toks[i + 1] || '' : '',
    amount: i >= 0 ? parseFloat((toks[i + 2] || '').replace(/[^0-9.]/g, '')) : NaN,
  };
}
// Receipt times are Addis Ababa time (UTC+3), formatted dd-mm-yyyy hh:mm:ss.
export function parseEAT(s) {
  const m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(s || '');
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4] - 3, +m[5], +m[6]) : null;
}
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
// 'ok' = credited to one of our accounts; 'unknown' = right number but we don't know its name yet; 'no' = someone else.
export function receiverCheck(r, receivers = RECEIVERS) {
  const acct = String(r.account).replace(/\D/g, '');
  let verdict = 'no';
  for (const x of receivers) {
    if (!acct.endsWith(x.last4)) continue;
    if (!x.name) { verdict = 'unknown'; continue; }
    if (norm(r.receiver).startsWith(norm(x.name).slice(0, 12))) return 'ok';
  }
  return verdict;
}
export const receiverOk = (r, receivers) => receiverCheck(r, receivers) === 'ok';
export async function fetchReceipt(txn) {
  const r = await fetch(RECEIPT_URL + encodeURIComponent(txn), {
    headers: { 'user-agent': 'Mozilla/5.0 (DINGUY registry)' },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error('receipt http ' + r.status);
  return r.text();
}
