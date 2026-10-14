// POST /api/jami-webhook — JamiDev tells us a payment went through (order.created / order.completed).
// Signed with JAMI_WEBHOOK_SECRET; the raw body is needed to check the signature.
import { kv, send } from './_lib.js';
import { verifyJami, markPaidByJami } from './_jami.js';

const rawBody = (req) => new Promise((ok, fail) => { let b = ''; req.setEncoding('utf8'); req.on('data', (c) => (b += c)); req.on('end', () => ok(b)); req.on('error', fail); });

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const body = await rawBody(req); // never touch req.body here — Vercel would parse (and consume) it first
    if (!verifyJami(body, req.headers['x-jamidev-signature'], process.env.JAMI_WEBHOOK_SECRET)) return send(res, 401, { error: 'bad signature' });
    const ev = JSON.parse(body);
    if (ev.type === 'order.created' || ev.type === 'order.completed') {
      const d = ev.data || {};
      const id = d.sessionId && (await kv('GET', 'jami:' + d.sessionId));
      if (id && d.status === 'paid') await markPaidByJami(id, { sessionId: d.sessionId, amount: Number(d.amount), jamiOrderId: d.orderId });
      else if (!id) console.error('jami webhook: unknown session', d.sessionId);
    }
    send(res, 200, { ok: true });
  } catch (e) {
    console.error('jami-webhook', e.message);
    send(res, 500, { error: 'failed' });
  }
}
// Read the body ourselves so the signature is checked against the exact bytes Jami sent.
export const config = { api: { bodyParser: false } };
