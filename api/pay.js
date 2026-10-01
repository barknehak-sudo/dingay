// POST /api/pay — customer submits the telebirr transaction ID; we verify it against the official receipt.
import { kv, loadOrder, saveOrder, publish, publicOrder, send, fetchReceipt, parseReceipt, parseEAT, receiverCheck, limited, PAY_TO } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const { id, key } = req.body || {};
    const txn = String((req.body || {}).txn || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const o = await loadOrder(id);
    if (!o || o.key !== key) return send(res, 404, { error: 'Order not found.' });
    if (o.status === 'paid' || o.status === 'review' || o.status === 'removed') return send(res, 200, publicOrder(o));
    if (!/^[A-Z0-9]{8,14}$/.test(txn)) return send(res, 400, { error: 'That doesn’t look like a telebirr transaction ID. It’s the 10-character code in your SMS, e.g. DJ19BO2MR4.' });
    if (await limited('pay:' + o.id, 12, 86400)) return send(res, 429, { error: 'Too many attempts. Please contact us.' });

    // One transaction ID can only ever unlock one order.
    const claimed = await kv('SET', 'used:' + txn, o.id, 'NX');
    if (!claimed && (await kv('GET', 'used:' + txn)) !== o.id) return send(res, 409, { error: 'This transaction ID has already been used for another order.' });
    const release = () => kv('DEL', 'used:' + txn);

    o.txn = txn;
    o.submittedAt = Date.now();
    // Ethio Telecom's receipt service only answers Ethiopian IPs, so from Vercel we can't check it.
    // Default: queue for manual approval (the /office page, or verifier/ running on a machine in Ethiopia).
    if (process.env.RECEIPT_CHECK !== 'on') {
      o.status = 'review'; o.reason = 'check the receipt and approve';
      await saveOrder(o);
      await kv('SADD', 'review', o.id);
      return send(res, 200, publicOrder(o));
    }
    let html;
    try { html = await fetchReceipt(txn); } catch (e) {
      console.error('receipt fetch failed', e.message);
      o.status = 'review'; o.reason = 'telebirr receipt service unreachable — check manually';
      await saveOrder(o);
      await kv('SADD', 'review', o.id);
      return send(res, 200, publicOrder(o));
    }

    const r = parseReceipt(html, txn);
    if (!r.found) { await release(); return send(res, 400, { error: 'We couldn’t find that transaction. Check the ID in your telebirr SMS and try again.' }); }
    if (!/completed/i.test(r.status)) { await release(); return send(res, 400, { error: 'That telebirr payment is not completed yet.' }); }
    const rc = receiverCheck(r);
    if (rc === 'no') { await release(); return send(res, 400, { error: `That payment was not sent to DINGUY (${PAY_TO.phone}).` }); }

    const paidAt = parseEAT(r.date);
    Object.assign(o, { payer: r.payer, paidAmount: r.amount, paidAt });
    const problems = [];
    if (rc === 'unknown') problems.push(`receiver name on receipt is "${r.receiver}" — check it's your account`);
    if (!(r.amount >= o.price)) problems.push(`paid ${r.amount} Birr, price is ${o.price} Birr`);
    if (!paidAt || paidAt < o.createdAt - 15 * 60e3) problems.push('payment is older than the order');
    if (paidAt && paidAt > Date.now() + 10 * 60e3) problems.push('payment date is in the future');

    if (problems.length) { o.status = 'review'; o.reason = problems.join('; '); await kv('SADD', 'review', o.id); }
    else { o.status = 'paid'; o.approvedBy = 'auto'; o.approvedAt = Date.now(); await publish(o); }
    await saveOrder(o);
    send(res, 200, publicOrder(o));
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}
