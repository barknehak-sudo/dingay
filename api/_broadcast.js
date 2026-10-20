// Messages to many customers at once (/office → Send), and the order export for the Google Sheet.
// A broadcast is stored as one job ('bc:job'); /office sends it a batch at a time while the page is open,
// so it can be stopped, and it carries on where it left off if the page is closed and opened again.
import { kv, getJSON, setJSON } from './_lib.js';
import { sendSMS, sendEmail, links } from './_notify.js';

const JOB = 'bc:job', OPTOUT = 'optout';
const SMS_BATCH = 20; // SMS per tick
// Gmail: broadcast emails are spaced out and capped so the sender isn't flagged as spam
// (the automatic certificate emails have their own 60 a day on top; Gmail's limit is ~500).
const MAIL_GAP_S = 15, MAIL_PER_DAY = 200;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' });

export const AUDIENCES = {
  paid: 'Buyers who paid',
  unpaid: 'Buyers who never paid',
  receivers: 'Dinguy receivers (paid orders)',
  everyone: 'Everyone (buyers and receivers)',
};
const normPhone = (p) => { const m = /^(?:251|0)?([79]\d{8})$/.exec(String(p || '').replace(/[^\d]/g, '')); return m ? '0' + m[1] : null; };
const normMail = (e) => { const s = String(e || '').trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(s) ? s : null; };

export async function allOrders() {
  const ids = await kv('LRANGE', 'orders', 0, 999);
  const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
  return raw.filter(Boolean).map((r) => JSON.parse(r));
}

// Who gets it: one entry per phone number (SMS) or email address, newest order first, without opt-outs.
export async function audience(channel, who) {
  if (!AUDIENCES[who]) throw new Error('Choose who gets it.');
  const orders = (await allOrders()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const out = new Set((await kv('SMEMBERS', OPTOUT)).map((x) => normPhone(x) || normMail(x) || x));
  const paidKeys = new Set();
  for (const o of orders) if (o.status === 'paid') { const k = normPhone(o.phone) || normMail(o.byEmail); if (k) paidKeys.add(k); }
  const seen = new Set(), list = [];
  const add = (to, name, lang) => { if (!to || out.has(to) || seen.has(to)) return; seen.add(to); list.push({ to, name: String(name || '').trim(), lang }); };
  for (const o of orders) {
    const buyer = channel === 'sms' ? normPhone(o.phone) : normMail(o.byEmail);
    const recv = channel === 'sms' ? normPhone(o.toPhone) : normMail(o.email);
    const paid = o.status === 'paid';
    if ((who === 'paid' || who === 'everyone') && paid) add(buyer, o.by, o.lang);
    if (who === 'unpaid' && !paid && o.status !== 'removed' && !paidKeys.has(normPhone(o.phone) || normMail(o.byEmail))) add(buyer, o.by, o.lang);
    if ((who === 'receivers' || who === 'everyone') && paid) add(recv, o.to, o.lang);
  }
  return list;
}

// {name} → the person's first name.
const fill = (text, p) => String(text).replace(/\{name\}/gi, (p.name || '').split(/\s+/)[0] || 'there');
const mailFoot = `\n\n—\nDINGUY · dinguy.xyz\nDon’t want these emails? Reply “stop” and we’ll take you off the list.`;
async function deliver(job, p) {
  if (job.channel === 'sms') return sendSMS(p.to, fill(job.text, p));
  return sendEmail(p.to, fill(job.subject, p), fill(job.text, p) + mailFoot);
}

export const jobView = (j) => j && { id: j.id, channel: j.channel, who: j.who, subject: j.subject, text: j.text, total: j.total, done: j.i, sent: j.sent, failed: j.failed.length,
  failures: j.failed.slice(-5), state: j.state, startedAt: j.startedAt, finishedAt: j.finishedAt, waitUntil: j.waitUntil };

export async function startJob({ channel, who, subject, text }) {
  if (!['sms', 'email'].includes(channel)) throw new Error('Choose SMS or email.');
  text = String(text || '').trim().slice(0, 2000); subject = String(subject || '').trim().slice(0, 140);
  if (!text) throw new Error('Write the message.');
  if (channel === 'email' && !subject) throw new Error('Write a subject for the email.');
  const cur = await getJSON(JOB);
  if (cur && cur.state === 'sending') throw new Error('Another message is still sending. Stop it first.');
  const list = await audience(channel, who);
  if (!list.length) throw new Error('Nobody to send to in that group.');
  const job = { id: 'BC-' + Date.now().toString(36).toUpperCase(), channel, who, subject, text, list, total: list.length, i: 0, sent: 0, failed: [], state: 'sending', startedAt: Date.now() };
  await setJSON(JOB, job);
  return job;
}

// Sends the next batch: up to 20 SMS, or one email (emails are spaced 15 s apart, 200 a day).
export async function tick() {
  const job = await getJSON(JOB);
  if (!job || job.state !== 'sending') return job;
  if (!(await kv('SET', 'bc:lock', '1', 'NX', 'EX', 30))) return job; // another tab is sending this batch
  try {
    let n = job.channel === 'sms' ? SMS_BATCH : 1;
    if (job.channel === 'email') {
      if (Number(await kv('GET', 'bcmail:day:' + today())) >= MAIL_PER_DAY) { job.waitUntil = 'tomorrow'; await setJSON(JOB, job); return job; }
      if (!(await kv('SET', 'bcmail:gap', '1', 'NX', 'EX', MAIL_GAP_S))) return job;
      job.waitUntil = null;
    }
    while (n-- > 0 && job.i < job.list.length) {
      const p = job.list[job.i++];
      try {
        await deliver(job, p);
        job.sent++;
        if (job.channel === 'email') { const c = await kv('INCR', 'bcmail:day:' + today()); if (c === 1) await kv('EXPIRE', 'bcmail:day:' + today(), 2 * 86400); }
      } catch (e) { job.failed.push({ to: p.to, msg: String(e.message).slice(0, 120) }); }
    }
    if (job.i >= job.list.length) { job.state = 'done'; job.finishedAt = Date.now(); job.list = []; } // the list isn't needed any more
    await setJSON(JOB, job);
    return job;
  } finally { await kv('DEL', 'bc:lock'); }
}
export async function stopJob() {
  const job = await getJSON(JOB);
  if (job && job.state === 'sending') { job.state = 'stopped'; job.finishedAt = Date.now(); job.list = []; await setJSON(JOB, job); }
  return job;
}
export const getJob = () => getJSON(JOB);
export async function testSend({ channel, subject, text, to }) {
  const p = { to: channel === 'sms' ? normPhone(to) : normMail(to), name: 'Test' };
  if (!p.to) throw new Error(channel === 'sms' ? 'Test phone number doesn’t look right.' : 'Test email doesn’t look right.');
  if (!String(text || '').trim()) throw new Error('Write the message first.');
  await deliver({ channel, subject: '[TEST] ' + String(subject || ''), text: String(text || '') }, p);
  return p.to;
}
export async function optout(value, undo) {
  const v = normPhone(value) || normMail(value);
  if (!v) throw new Error('Enter a phone number or an email.');
  await kv(undo ? 'SREM' : 'SADD', OPTOUT, v);
  return kv('SMEMBERS', OPTOUT);
}
export const optouts = () => kv('SMEMBERS', OPTOUT);

/* ---------- export for the Google Sheet ----------
   One row per order, with Order ID as the key, so the sheet can update rows instead of adding doubles.
   since = ms: only orders changed after that (saveOrder keeps 'upd', a sorted set of id → last change). */
const addis = (ms) => (ms ? new Date(ms + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') : '');
const yes = (t) => (t ? addis(t) : '');
export const COLUMNS = ['Order ID', 'Status', 'Ordered (Addis)', 'Paid (Addis)', 'Paid via', 'Jami app', 'Amount received (Birr)', 'Price (Birr)', 'Stone', 'Friend / Loved one',
  'Buyer name', 'Buyer phone', 'Buyer email', 'Receiver name', 'Receiver phone', 'Receiver email', 'Occasion', 'Message', 'Language',
  'Telebirr transaction', 'Approved by', 'Added by hand', 'Certificate link', 'Pay link',
  'Help SMS sent', 'Congrats SMS sent', 'Receiver SMS sent', 'Certificate email sent', 'Receipt email sent', 'Last change (Addis)'];
const STATUS = { paid: 'Paid', awaiting: 'Not paid', review: 'Payment being checked', rejected: 'Payment rejected', removed: 'Removed from registry' };
function row(o, site) {
  const f = o.follow || {}, jami = o.approvedBy === 'jami' || o.paidTo === 'jami', paid = o.status === 'paid' || o.status === 'removed';
  const l = links(o, site);
  return [o.id, STATUS[o.status] || o.status, addis(o.createdAt), paid ? addis(o.approvedAt) : '',
    paid ? (jami ? 'Jami' : o.manual ? 'By hand' : 'Telebirr') : '', o.jami ? ({ telebirr: 'Telebirr', mpesa: 'M-Pesa', cbe: 'CBE Birr' }[o.jami.gateway] || o.jami.gateway || '') : '',
    paid ? (o.paidAmount != null ? o.paidAmount : o.price) : '', o.price, o.name, o.price === 89 ? 'Friend' : 'Loved one',
    o.by, o.phone || '', o.byEmail || '', o.to, o.toPhone || '', o.email || '', o.occasion || '', o.message || '', o.lang === 'am' ? 'Amharic' : 'English',
    o.manual ? '' : o.txn || '', o.approvedBy || '', o.manual ? 'Yes' : '', paid ? l.recordLink : '', paid ? '' : l.payLink,
    yes(f.help_sms), yes(f.congrats_sms), yes(f.to_sms), yes(f.email), yes(f.buyer_email), addis(o.updatedAt || o.approvedAt || o.createdAt)];
}
export async function exportRows(since, site) {
  const now = Date.now();
  let orders;
  if (since > 0) {
    const ids = await kv('ZRANGEBYSCORE', 'upd', String(since), '+inf');
    const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
    orders = raw.filter(Boolean).map((r) => JSON.parse(r));
  } else orders = await allOrders();
  orders.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // oldest first, so new rows go at the bottom
  return { now, full: !(since > 0), columns: COLUMNS, rows: orders.map((o) => row(o, site)) };
}
