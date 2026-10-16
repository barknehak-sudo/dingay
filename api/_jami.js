// JamiDev payments (https://dev.jami.bio/docs): the buyer approves Telebirr / M-Pesa / CBE Birr on their phone,
// Jami confirms it, and the order is marked paid — no transaction code, no verifier.
//   JAMI_TOKEN            — API token from Jami → Developer → API Tokens (jamidev_test_… sandbox, jamidev_live_… live)
//   JAMI_PRODUCT_FRIEND   — optional: public product id (p_…) of the 89 ETB product (default: the DINGUY org's)
//   JAMI_PRODUCT_LOVED    — optional: public product id (p_…) of the 199 ETB product (default: the DINGUY org's)
//   JAMI_WEBHOOK_SECRET   — secret of the webhook pointing at https://dinguy.xyz/api/jami-webhook
// Without JAMI_TOKEN the pay page keeps the paste-the-code flow only.
import crypto from 'node:crypto';
import { kv, loadOrder, saveOrder, publish } from './_lib.js';
import { followUp } from './_notify.js';

const BASE = 'https://jami.bio/api/jamidev';
export const GATEWAYS = ['telebirr', 'mpesa', 'cbe'];
// Products in the DINGUY organization on JamiDev (public ids, safe to keep in code).
const PRODUCT = { friend: process.env.JAMI_PRODUCT_FRIEND || 'p_4js0GdCu_nM8', loved: process.env.JAMI_PRODUCT_LOVED || 'p_Ny9Z5_qIBIVc' };
const productFor = (price) => (price === 89 ? PRODUCT.friend : PRODUCT.loved);
export const jamiOn = () => !!process.env.JAMI_TOKEN;
export const jamiSandbox = () => String(process.env.JAMI_TOKEN || '').startsWith('jamidev_test_');

// Start a payment for one of our orders. Returns { mode: 'direct' | 'redirect', checkoutUrl, sessionId }.
export async function startJami(o, gateway, site) {
  const r = await fetch(BASE + '/checkout', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + process.env.JAMI_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({
      productId: productFor(o.price),
      // Jami needs an email; buyers who didn't give one get an address that just identifies the order.
      customer: { email: o.byEmail || `${o.id.toLowerCase()}@orders.dinguy.xyz`, phone: o.phone, name: o.by, externalId: o.id },
      gateway,
      successUrl: `${site}/#/pay/${o.id}/${o.key}`,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  console.log('jami start', o.id, gateway, r.status, JSON.stringify(j).slice(0, 400));
  if (!r.ok) throw new Error(j.error || 'Jami ' + r.status);
  await kv('SET', 'jami:' + j.sessionId, o.id, 'EX', 3 * 86400);
  return { sessionId: j.sessionId, mode: j.mode || (j.checkoutUrl ? 'redirect' : 'direct'), checkoutUrl: j.checkoutUrl || null, orderId: j.orderId || null };
}

// Public status endpoint; Jami reconciles with the payment provider while the session is open.
export async function jamiSession(sessionId) {
  const r = await fetch(BASE + '/checkout/' + encodeURIComponent(sessionId), { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Jami status ' + r.status);
  return r.json(); // { status: 'open' | 'completed' | 'expired', orderId, amount, ... }
}

// Mark our order paid from a confirmed Jami payment. Safe to call from both the webhook and the status poll.
export async function markPaidByJami(id, { sessionId, amount, jamiOrderId }) {
  if (!(await kv('SET', 'jamipaid:' + id, '1', 'NX', 'EX', 7 * 86400))) return loadOrder(id);
  const o = await loadOrder(id);
  if (!o || o.status === 'paid' || o.status === 'removed') return o;
  Object.assign(o, {
    status: 'paid', approvedBy: 'jami', approvedAt: Date.now(),
    paidAmount: Number.isFinite(amount) ? amount / 100 : o.price, paidTo: 'jami',
    jami: { ...(o.jami || {}), sessionId, orderId: jamiOrderId || null, paidAt: Date.now() },
  });
  await publish(o);
  await saveOrder(o);
  await kv('SREM', 'review', o.id);
  await followUp(o.id).catch((e) => console.error('followUp', e.message));
  return o;
}

// If this order has an open Jami payment, ask Jami whether it went through.
export async function checkJami(o) {
  const s = o.jami && o.jami.sessionId;
  if (!s || o.status === 'paid' || o.status === 'removed') return o;
  try {
    const st = await jamiSession(s);
    if (st.status !== 'open') console.log('jami session', o.id, s, JSON.stringify(st).slice(0, 600));
    o.jami = { ...o.jami, last: { status: st.status, at: Date.now() } }; // full answer is in the log above
    if (st.status === 'completed' && st.orderId) return (await markPaidByJami(o.id, { sessionId: s, amount: Number(st.amount), jamiOrderId: st.orderId })) || o;
    if (st.status === 'expired' && o.jami.state !== 'expired') { o.jami = { ...o.jami, state: 'expired' }; await saveOrder(o); }
  } catch (e) { console.error('jami status', o.id, e.message); }
  return o;
}

// Webhook signature: HMAC-SHA256 over "{t}.{rawBody}", header "t=…,v1=…", 5-minute replay window.
export function verifyJami(rawBody, header, secret) {
  const t = /t=(\d+)/.exec(header || '')?.[1], v1 = /v1=([a-f0-9]+)/.exec(header || '')?.[1];
  if (!t || !v1 || !secret) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return expected.length === v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}
