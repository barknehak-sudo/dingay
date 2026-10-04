// GET /api/status?id=DG-123456&key=… — the customer's own order.
import { loadOrder, publicOrder, send } from './_lib.js';
import { sweep } from './_notify.js';

export default async function handler(req, res) {
  try {
    const o = await loadOrder(req.query.id);
    if (!o || o.key !== req.query.key) return send(res, 404, { error: 'Order not found.' });
    await sweep();
    send(res, 200, publicOrder(o));
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
}
