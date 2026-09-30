// GET /api/registry?no=DG-123456 — public record, only exists once paid.  GET /api/registry — recent entries.
import { kv, getJSON, send } from './_lib.js';

export default async function handler(req, res) {
  try {
    const no = String(req.query.no || '').toUpperCase();
    if (!no) {
      const ids = await kv('LRANGE', 'recent', 0, 7);
      const recs = ids.length ? await kv('MGET', ...ids.map((i) => 'reg:' + i)) : [];
      return send(res, 200, { recent: recs.filter(Boolean).map((r) => { const x = JSON.parse(r); return { no: x.no, to: x.to, type: x.type, kind: x.kind, ts: x.ts }; }) });
    }
    if (!/^DG-\d{6}$/.test(no)) return send(res, 404, { error: 'Not found' });
    const rec = await getJSON('reg:' + no);
    if (!rec) return send(res, 404, { error: 'Not found' });
    send(res, 200, rec);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
}
