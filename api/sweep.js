// GET /api/sweep — sends any automatic SMS/email that is due. Point a free outside cron
// (e.g. cron-job.org, every 5 minutes) at it so help texts go out even when nobody is on the site.
import { send } from './_lib.js';
import { sweep } from './_notify.js';

export default async function handler(req, res) {
  await sweep();
  send(res, 200, { ok: true });
}
