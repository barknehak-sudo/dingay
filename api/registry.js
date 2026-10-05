// Public registry. Only the number, who has the stone, the stone and the date are public.
// GET /api/registry                 → recent entries
// GET /api/registry?q=abel|4281|diamond → search by name, registration number or stone
// GET /api/registry?no=DG-123456     → one public record
// GET /api/registry?no=DG-123456&key=… → the full record (sender, occasion, message) for the private link
import { kv, getJSON, setJSON, loadOrder, recordOf, publicRecord, PUBLIC_FIELDS, send, ip, limited } from './_lib.js';

const fold = (s) => String(s || '').toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();
// Records published before this change still hold the private fields — trim them the first time they're read.
async function trimmed(rec) {
  if (Object.keys(rec).some((k) => !PUBLIC_FIELDS.includes(k))) { rec = publicRecord(rec); await setJSON('reg:' + rec.no, rec); }
  return rec;
}
const brief = (x) => ({ no: x.no, to: x.to, type: x.type, kind: x.kind, ts: x.ts });

export default async function handler(req, res) {
  try {
    const no = String(req.query.no || '').toUpperCase();
    const q = fold(req.query.q).slice(0, 60);
    if (q) {
      if (await limited('search:' + ip(req), 60, 60)) return send(res, 429, { error: 'Too many searches. Wait a minute.' });
      const ids = await kv('LRANGE', 'orders', 0, 999);
      const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'reg:' + i)) : [];
      const digits = q.replace(/\D/g, '');
      const words = q.split(' ');
      const out = [];
      for (const r of raw) {
        if (!r) continue;
        const rec = await trimmed(JSON.parse(r));
        const hay = fold([rec.to, rec.type, rec.kind, rec.slug && rec.slug.replace(/-/g, ' ')].join(' '));
        const hit = (digits.length >= 3 && rec.no.replace(/\D/g, '').includes(digits)) || words.every((w) => hay.includes(w));
        if (hit) out.push(brief(rec));
      }
      out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      return send(res, 200, { results: out.slice(0, 40), total: out.length });
    }
    if (!no) {
      const ids = await kv('LRANGE', 'recent', 0, 7);
      const recs = ids.length ? await kv('MGET', ...ids.map((i) => 'reg:' + i)) : [];
      return send(res, 200, { recent: recs.filter(Boolean).map((r) => brief(JSON.parse(r))) });
    }
    if (!/^DG-\d{6}$/.test(no)) return send(res, 404, { error: 'Not found' });
    let rec = await getJSON('reg:' + no);
    if (!rec) return send(res, 404, { error: 'Not found' });
    if (req.query.key) {
      const o = await loadOrder(no);
      if (o && o.key === req.query.key && o.status === 'paid') return send(res, 200, { ...recordOf(o), private: true });
    }
    send(res, 200, await trimmed(rec));
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
}
