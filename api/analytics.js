// Visitors for /office, from Google Analytics 4 (the Data API). Header x-admin-password must match ADMIN_PASSWORD.
// PARTNER_PASSWORD works too (it's only counts).
// GET /api/analytics          → the report (cached in KV for 10 minutes)
// GET /api/analytics?fresh=1  → skip the cache
// GET /api/analytics?export=1 → every day GA has, as tables (daily, sources, pages, places & devices, events) for /office to save as CSV
// Needs two Vercel env vars; without them the answer is {setup:true, missing:[…]} and /office shows the steps.
//   GA_PROPERTY_ID          — the number from GA → Admin → Property details (not the G-… measurement ID)
//   GA_SERVICE_ACCOUNT_JSON — the whole JSON key of a Google Cloud service account that has Viewer access
// Signs in as the service account with a JWT signed by node:crypto, so no Google library is needed.
import crypto from 'node:crypto';
import { kv, getJSON, send, sameSecret, limited, ip } from './_lib.js';

const CACHE = 'ga:report', TTL = 600;
const EVENTS = ['begin_checkout', 'add_payment_info', 'purchase'];

function config() {
  const property = String(process.env.GA_PROPERTY_ID || '').replace(/\D/g, '');
  let sa = null, raw = String(process.env.GA_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw && !raw.startsWith('{')) { try { raw = Buffer.from(raw, 'base64').toString('utf8'); } catch {} } // base64 pasted is fine too
  try { sa = raw ? JSON.parse(raw) : null; } catch {}
  if (sa && sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  const missing = [];
  if (!property) missing.push('GA_PROPERTY_ID');
  if (!sa || !sa.client_email || !sa.private_key) missing.push('GA_SERVICE_ACCOUNT_JSON');
  return { property, sa, missing };
}

/* ---------- Google sign-in (service account → access token) ---------- */
let token = { value: '', exp: 0, who: '' }; // kept between calls while the function stays warm
const b64url = (x) => Buffer.from(x).toString('base64url');
async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (token.value && token.who === sa.client_email && token.exp - 60 > now) return token.value;
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claims).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${sig}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Google sign-in failed: ' + (j.error_description || j.error || r.status));
  token = { value: j.access_token, exp: now + (j.expires_in || 3600), who: sa.client_email };
  return token.value;
}

/* ---------- the report ---------- */
// Where a visit came from, in the owner's words. Telegram's in-app browser often sends no referrer, so some of it shows as Direct.
function channel(source, medium) {
  const s = String(source || '').toLowerCase(), m = String(medium || '').toLowerCase();
  if (/telegram|(^|\.)t\.me$/.test(s)) return 'Telegram';
  if (/tiktok/.test(s)) return 'TikTok';
  if (/instagram|^ig$|l\.instagram/.test(s)) return 'Instagram';
  if (/facebook|^fb$|^m\.facebook|^l\.facebook/.test(s)) return 'Facebook';
  if (/google/.test(s)) return 'Google';
  if (s === '(direct)' || (m === '(none)' && !s)) return 'Direct';
  return 'Other';
}
const n = (row, i = 0) => Number(row.metricValues[i].value) || 0;
const dim = (row, i = 0) => row.dimensionValues[i].value;

async function report({ property, sa }) {
  const week = { startDate: '6daysAgo', endDate: 'today' };
  const body = {
    requests: [
      { // totals: today, last 7 days, the 7 before
        dateRanges: [{ startDate: 'today', endDate: 'today', name: 'today' }, { ...week, name: 'week' }, { startDate: '13daysAgo', endDate: '7daysAgo', name: 'prev' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      },
      { dateRanges: [{ startDate: '13daysAgo', endDate: 'today' }], dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }] },
      { dateRanges: [week], dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }], metrics: [{ name: 'activeUsers' }], limit: 200 },
      { dateRanges: [week], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 8 },
      { dateRanges: [week], dimensions: [{ name: 'eventName' }], metrics: [{ name: 'activeUsers' }, { name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: EVENTS } } } },
    ],
  };
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + (await accessToken(sa)), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error((j.error && j.error.message) || 'Google Analytics answered ' + r.status);
    e.status = j.error && j.error.status;
    throw e;
  }
  const [tot, daily, src, pages, ev] = j.reports.map((x) => x.rows || []);

  const totals = {};
  for (const row of tot) totals[dim(row)] = { users: n(row, 0), sessions: n(row, 1), views: n(row, 2) };
  const zero = { users: 0, sessions: 0, views: 0 };

  // every one of the last 14 days, including days with no visitors
  const perDay = Object.fromEntries(daily.map((row) => [dim(row), n(row)]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + 3 * 3600e3 - (13 - i) * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
    return { d: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`, n: perDay[d] || 0 };
  });

  const ch = {}, other = {};
  for (const row of src) {
    const c = channel(dim(row, 0), dim(row, 1));
    ch[c] = (ch[c] || 0) + n(row);
    if (c === 'Other') other[dim(row, 0)] = (other[dim(row, 0)] || 0) + n(row);
  }
  const sources = Object.entries(ch).map(([name, users]) => ({ name, users })).sort((a, b) => b.users - a.users);

  const events = Object.fromEntries(EVENTS.map((e) => [e, { users: 0, count: 0 }]));
  for (const row of ev) events[dim(row)] = { users: n(row, 0), count: n(row, 1) };

  return {
    today: totals.today || zero, week: totals.week || zero, prev: totals.prev || zero, days, sources,
    otherSources: Object.entries(other).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, u]) => `${s} ${u}`),
    pages: pages.map((row) => ({ path: dim(row), views: n(row, 0), users: n(row, 1) })),
    events, at: Date.now(),
  };
}

/* ---------- export: everything, day by day ---------- */
// GA4 keeps data from the property's start; asking from GA4's earliest allowed date returns all of it.
const ALL = [{ startDate: '2015-08-14', endDate: 'today' }];
const EXPORTS = {
  daily: { dimensions: ['date'], metrics: ['activeUsers', 'newUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'averageSessionDuration', 'bounceRate', 'eventCount'] },
  sources: { dimensions: ['date', 'sessionSource', 'sessionMedium'], metrics: ['activeUsers', 'sessions'] },
  pages: { dimensions: ['date', 'pagePath'], metrics: ['screenPageViews', 'activeUsers'] },
  places_devices: { dimensions: ['date', 'country', 'city', 'deviceCategory'], metrics: ['activeUsers', 'sessions'] },
  events: { dimensions: ['date', 'eventName'], metrics: ['eventCount', 'activeUsers'] },
};
async function exportAll({ property, sa }) {
  const names = Object.keys(EXPORTS);
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + (await accessToken(sa)), 'content-type': 'application/json' },
    body: JSON.stringify({ requests: names.map((k) => ({ dateRanges: ALL, dimensions: EXPORTS[k].dimensions.map((name) => ({ name })), metrics: EXPORTS[k].metrics.map((name) => ({ name })),
      orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 100000, keepEmptyRows: false })) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || 'Google Analytics answered ' + r.status);
  const day = (v) => /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}` : v;
  const out = {};
  names.forEach((k, i) => {
    const rows = (j.reports[i].rows || []).map((row) => [...row.dimensionValues.map((d, x) => (x === 0 ? day(d.value) : d.value)), ...row.metricValues.map((m) => Number(m.value))]);
    out[k] = { headers: [...EXPORTS[k].dimensions, ...EXPORTS[k].metrics], rows };
  });
  return out;
}

export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_PASSWORD) return send(res, 503, { error: 'ADMIN_PASSWORD is not set in Vercel.' });
    // The partner password (read-only, see api/admin.js) may see these too: they're counts, no customer details.
    const given = req.headers['x-admin-password'];
    if (!sameSecret(given, process.env.ADMIN_PASSWORD) && !(process.env.PARTNER_PASSWORD && sameSecret(given, process.env.PARTNER_PASSWORD))) {
      if (await limited('adminfail:' + ip(req), 20, 600)) return send(res, 429, { error: 'Too many wrong passwords. Wait 10 minutes.' });
      return send(res, 401, { error: 'Wrong password.' });
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

    const cfg = config();
    if (cfg.missing.length) return send(res, 200, { setup: true, missing: cfg.missing, email: cfg.sa && cfg.sa.client_email });
    if (req.query.export) {
      try { return send(res, 200, { property: cfg.property, at: Date.now(), reports: await exportAll(cfg) }); }
      catch (e) { console.error('analytics export', e.message); return send(res, 502, { error: e.message }); }
    }
    if (!req.query.fresh) { const hit = await getJSON(CACHE); if (hit && hit.property === cfg.property) return send(res, 200, { ...hit, cached: true }); }
    try {
      const out = { ...(await report(cfg)), property: cfg.property };
      await kv('SET', CACHE, JSON.stringify(out), 'EX', TTL);
      return send(res, 200, out);
    } catch (e) {
      console.error('analytics', e.message);
      // PERMISSION_DENIED = the service account isn't added to the GA property (or the property ID is wrong)
      return send(res, 200, { error: e.message, denied: e.status === 'PERMISSION_DENIED' || /permission/i.test(e.message), email: cfg.sa.client_email });
    }
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
}
