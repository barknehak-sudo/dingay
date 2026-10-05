// GET /api/sweep — sends any automatic SMS/email that is due. Point a free outside cron
// (e.g. cron-job.org, every 5 minutes) at it so help texts go out even when nobody is on the site.
import { send } from './_lib.js';
import { sweep, sendTestEmail } from './_notify.js';
import { kv } from './_lib.js';

export default async function handler(req, res) {
  // TEMPORARY: one test email to the owner, once ever. Remove after checking.
  if ('test-email' in (req.query || {})) {
    if (!(await kv('SET', 'testmail:once', '1', 'NX'))) return send(res, 409, { error: 'already sent' });
    try { return send(res, 200, await sendTestEmail('barknehak@gmail.com')); } catch (e) { return send(res, 502, { error: e.message }); }
  }
  await sweep();
  send(res, 200, { ok: true });
}
