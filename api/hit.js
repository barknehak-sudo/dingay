// POST /api/hit {what:'new', first:true|false} — counts taps on the "NEW" button, to see if people want new Dinguys.
// `first` is true the first time this phone/browser taps it, so we can count people as well as taps.
import { kv, send, ip, limited } from './_lib.js';

const WHAT = ['new'];
export const day = (ms = Date.now()) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' });

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = req.body || {};
    if (!WHAT.includes(b.what)) return send(res, 400, { error: 'Unknown.' });
    if (await limited('hit:' + ip(req), 30, 3600)) return send(res, 200, { ok: true }); // ignore spam quietly
    await kv('INCR', `hits:${b.what}:taps`);
    if (b.first === true) {
      await kv('INCR', `hits:${b.what}:people`);
      const k = `hits:${b.what}:day:${day()}`;
      if ((await kv('INCR', k)) === 1) await kv('EXPIRE', k, 120 * 86400);
    }
    send(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    send(res, 200, { ok: true });
  }
}
