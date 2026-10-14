// GET /api/status?id=DG-123456&key=… — the customer's own order.
import { loadOrder, publicOrder, send } from './_lib.js';
import { sweep } from './_notify.js';
import { checkJami, jamiOn } from './_jami.js';

export default async function handler(req, res) {
  try {
    let o = await loadOrder(req.query.id);
    if (!o || o.key !== req.query.key) return send(res, 404, { error: 'Order not found.' });
    o = await checkJami(o); // an open phone payment: ask Jami if it went through
    await sweep();
    // jami: whether "Pay now" is available, and the state of this order's phone payment
    send(res, 200, { ...publicOrder(o), jami: jamiOn() ? { on: true, phone: String(o.phone || '').replace(/^(\d{4})\d{3}(\d{3})$/, '$1 *** $2'), ...(o.jami ? { state: o.jami.state, mode: o.jami.mode, gateway: o.jami.gateway, startedAt: o.jami.startedAt } : {}) } : null });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
}
