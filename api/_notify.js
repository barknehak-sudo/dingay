// Automatic follow-ups: SMS through SMS Ethiopia, email through Gmail (offscriptet@gmail.com).
//   SMSETHIOPIA_KEY     — API key from smsethiopia.com → Console → API Keys (no key = no automatic SMS)
//   GMAIL_APP_PASSWORD  — Gmail app password for GMAIL_USER (no password = no automatic email)
//   GMAIL_USER          — sender address, default offscriptet@gmail.com
//   SITE_URL            — links inside messages, default https://dinguy.xyz
// Whatever isn't sent automatically (not configured, or the send failed) stays a task in /office.
import nodemailer from 'nodemailer';
import { kv, loadOrder, saveOrder, PAY_TO } from './_lib.js';

export const SITE = (process.env.SITE_URL || 'https://dinguy.xyz').replace(/\/$/, '');
export const SW_MAIL = process.env.GMAIL_USER || 'offscriptet@gmail.com';
const SW_CONTACT = 'infosideways7@gmail.com'; // SIDEWAYS contact in the email footer
const SW_LINK = 'https://dinguy.xyz/#/sideways';
export const autoOn = () => ({ sms: !!process.env.SMSETHIOPIA_KEY, email: AUTO_EMAIL && !!process.env.GMAIL_APP_PASSWORD, emailReady: !!process.env.GMAIL_APP_PASSWORD, from: SW_MAIL });

export const links = (o, site = SITE) => ({ payLink: `${site}/#/pay/${o.id}/${o.key}`, recordLink: `${site}/#/registry/${o.id}/${o.key}` });
// recordLink carries the key, so whoever gets the SMS/email sees the full record and certificate.

// The texts — used for automatic sends and for the manual buttons in /office.
export function messages(o, site = SITE) {
  const am = o.lang === 'am', { payLink, recordLink } = links(o, site);
  const num = PAY_TO.phone, nm = PAY_TO.name ? ` (${PAY_TO.name})` : '';
  const help = am
    ? `ሰላም ${o.by}፣ ከDINGUY ነው 👋 ለ${o.to} ያዘዙት ${o.name} ክፍያ እየጠበቀ ነው።\n1) ቴሌብርን ይክፈቱ → Send Money\n2) ${o.price} ብር ወደ ${num}${nm} ይላኩ\n3) ከደረሰኙ ላይ የግብይት ቁጥሩን (Transaction Number) ይቅዱ\n4) እዚህ ያስገቡት፦ ${payLink}\nጥያቄ ካለዎት፦ ${num}`
    : `Hi ${o.by}, this is DINGUY 👋 Your ${o.name} for ${o.to} is waiting for payment.\n1) Open telebirr → Send Money\n2) Send ${o.price} Birr to ${num}${nm}\n3) Copy the Transaction Number from the receipt\n4) Paste it here: ${payLink}\nQuestions? Call ${num}`;
  const congrats = am
    ? `እንኳን ደስ አለዎት ${o.by}! 🎉 ${o.to} በይፋ በ${o.name} ተመዝግቧል። የምዝገባ ቁ. ${o.id}። ይመልከቱና ሰርተፊኬቱን ያስቀምጡ፦ ${recordLink} — DINGUY`
    : `Congratulations ${o.by}! 🎉 ${o.to} is now officially registered with ${o.name}. Registration No. ${o.id}. See it and save the certificate: ${recordLink} — DINGUY`;
  // to the recipient, once paid
  const gift = am
    ? `ሰላም ${o.to}! 🎁 ${o.by} በDINGUY መዝገብ ${o.name}ን በስምዎ አስመዝግበዋል። የምዝገባ ቁ. ${o.id}። መዝገብዎንና ሰርተፊኬትዎን ይመልከቱ፦ ${recordLink} — DINGUY`
    : `Hi ${o.to}! 🎁 ${o.by} has registered ${o.name} in your name with the DINGUY Registry. Registration No. ${o.id}. See your record and certificate: ${recordLink} — DINGUY`;
  const subject = am ? `${o.to}፣ በስምዎ ድንጋይ ተመዝግቧል` : `${o.to}, a stone has been registered in your name`;
  const body = am
    ? `ሰላም ${o.to}፣\n\n${o.by} በDINGUY መዝገብ ውስጥ ${o.name}ን በስምዎ አስመዝግበዋል።\n\n${o.message ? `“${o.message}”\n\n` : ''}የምዝገባ ቁ. ${o.id}\nመዝገብዎና ሰርተፊኬትዎ፦ ${recordLink}\n\nDINGUY® — ከልክ በላይ ትርጉም ላላቸው አጋጣሚዎች የተመዘገቡ ድንጋዮች።\nዲጂታል ምዝገባ። አካላዊ ድንጋይ አይካተትም።\n\n—\nDINGUY የSIDEWAYS ስራ ነው።\nSIDEWAYS ሰዎች ቆም ብለው፣ ደግመው አይተው እንዲያስታውሱ የሚያደርጉ ድረ-ገጾችን፣ ዘመቻዎችንና ሀሳቦችን ይሰራል።\nየእርስዎን ሀሳብ እንስራው፦ ${SW_LINK}\n${SW_CONTACT} · 0996 567 218`
    : `Hi ${o.to},\n\n${o.by} has registered ${o.name} in your name with the DINGUY Registry.\n\n${o.message ? `“${o.message}”\n\n` : ''}Registration No. ${o.id}\nYour record and certificate: ${recordLink}\n\nDINGUY® — Registered stones for unreasonably meaningful occasions.\nDigital registration. No physical stone included.\n\n—\nDINGUY is a SIDEWAYS project.\nSIDEWAYS makes websites, campaigns and ideas that make people stop, look twice and remember.\nGot an idea? Let’s make people talk: ${SW_LINK}\n${SW_CONTACT} · 0996 567 218`;
  return { help, congrats, gift, subject, body };
}

/* ---------- senders ---------- */
export async function sendSMS(phone, text) {
  const m = /^0?([79]\d{8})$/.exec(String(phone || ''));
  if (!m) throw new Error('bad phone ' + phone);
  const r = await fetch('https://smsethiopia.com/api/sms/send', {
    method: 'POST',
    headers: { KEY: process.env.SMSETHIOPIA_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ msisdn: '251' + m[1], text }),
    signal: AbortSignal.timeout(10000),
  });
  const raw = await r.text();
  let j = null; try { j = JSON.parse(raw); } catch {}
  if (!r.ok || (j && (j.success === false || j.status === 'error' || j.error))) {
    console.error('smsethiopia reply', r.status, raw.slice(0, 1500));
    throw new Error(`smsethiopia ${r.status}: ${(j && (j.message || j.error || j.error_message)) || raw.slice(0, 160)}`);
  }
  return j || raw;
}

let mailer;
export async function sendEmail(to, subject, text) {
  mailer ||= nodemailer.createTransport({ service: 'gmail', auth: { user: SW_MAIL, pass: String(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, '') } });
  return mailer.sendMail({
    from: `DINGUY <${SW_MAIL}>`, replyTo: SW_MAIL, to, subject, text,
    // Lets Gmail/Outlook show "unsubscribe" instead of "report spam" — good for the sender's reputation.
    headers: { 'List-Unsubscribe': `<mailto:${SW_MAIL}?subject=unsubscribe>` },
  });
}

// A sample certificate email (the real template), so the Gmail setup can be checked.
export async function sendTestEmail(to) {
  const m = messages({ id: 'DG-000000', key: 'test', to: 'Test Recipient', by: 'DINGUY', name: 'DIAMOND', message: 'This is a test of the automatic certificate email.', lang: 'en' });
  const info = await sendEmail(to, '[TEST] ' + m.subject, m.body);
  return { from: SW_MAIL, to, id: info.messageId, response: info.response };
}

/* ---------- email pacing ----------
   Certificate emails that couldn't go out (Gmail not set up yet, or a failure) are caught up
   automatically — but slowly, so a fresh Gmail sender doesn't look like a spammer:
   one email every 2 minutes at most, 30 a day, never two to the same address within 24 h,
   and an address that fails 3 times is left for a human. */
const AUTO_EMAIL = false;
const MAIL_GAP_S = 120, MAIL_PER_DAY = 30, MAIL_MAX_TRIES = 3;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' });
// 'ok' = send now; 'addr' = this address had one in the last 24 h (others may go); 'wait' = nothing goes right now.
async function mailSlot(addr) {
  const to = String(addr).toLowerCase();
  if (await kv('GET', 'mail:to:' + to)) return 'addr';
  if (Number(await kv('GET', 'mail:day:' + today())) >= MAIL_PER_DAY) return 'wait';
  if (!(await kv('SET', 'mail:gap', '1', 'NX', 'EX', MAIL_GAP_S))) return 'wait';
  await kv('SET', 'mail:to:' + to, '1', 'EX', 86400);
  const n = await kv('INCR', 'mail:day:' + today());
  if (n === 1) await kv('EXPIRE', 'mail:day:' + today(), 2 * 86400);
  return 'ok';
}

/* ---------- what's due ---------- */
const MIN = 60e3, HOUR = 60 * MIN;
// SMS only for recent orders, so turning it on never texts old customers.
// Certificate emails have no age limit — every paid recipient should get theirs (paced, see above).
function due(o, now = Date.now()) {
  const f = o.follow || {}, out = [], on = autoOn();
  const age = now - o.createdAt, sincePaid = now - (o.approvedAt || o.createdAt);
  if (on.sms && o.phone && (o.status === 'awaiting' || o.status === 'rejected') && !f.help_sms && !f.help_skip && age > 30e3 && age < 24 * HOUR) out.push('help_sms');
  if (on.sms && o.phone && o.status === 'paid' && !f.congrats_sms && !f.congrats_skip && sincePaid < 24 * HOUR) out.push('congrats_sms');
  if (on.sms && o.toPhone && o.status === 'paid' && !f.to_sms && !f.to_skip && sincePaid < 48 * HOUR) out.push('to_sms');
  // Automatic certificate emails are off: too many landed in spam. Recipients get an SMS instead (to_sms).
  if (AUTO_EMAIL && on.email && o.email && o.status === 'paid' && !f.email && !f.email_skip && (((o.autoErr || {}).email || {}).n || 0) < MAIL_MAX_TRIES) out.push('email');
  return out;
}

// Send whatever is due for this order. Safe to call any number of times, from anywhere.
// Returns the order; `mailWaiting` is set when an email was due but has to wait for its slot.
export async function followUp(id, opts = {}) {
  let o = await loadOrder(id);
  if (!o) return null;
  const todo = due(o).filter((w) => !(w === 'email' && opts.noMail));
  if (!todo.length) return o;
  const m = messages(o), sent = {}, failed = {};
  for (const what of todo) {
    // One send per order per kind, even if two requests race. A failure retries after 30 minutes.
    if (await kv('GET', `auto:${o.id}:${what}`)) continue;
    if (what === 'email') { const slot = await mailSlot(o.email); if (slot !== 'ok') { if (slot === 'wait') followUp.mailWaiting = true; continue; } }
    if (!(await kv('SET', `auto:${o.id}:${what}`, '1', 'NX', 'EX', 172800))) continue;
    try {
      if (what === 'help_sms') await sendSMS(o.phone, m.help);
      if (what === 'congrats_sms') await sendSMS(o.phone, m.congrats);
      if (what === 'to_sms') await sendSMS(o.toPhone, m.gift);
      if (what === 'email') await sendEmail(o.email, m.subject, m.body);
      sent[what] = Date.now();
    } catch (e) {
      console.error('auto', what, o.id, e.message);
      failed[what] = { at: Date.now(), msg: String(e.message).slice(0, 200), n: (((o.autoErr || {})[what] || {}).n || 0) + 1 };
      await kv('EXPIRE', `auto:${o.id}:${what}`, 1800);
    }
  }
  if (!Object.keys(sent).length && !Object.keys(failed).length) return o;
  // Re-read so a change made meanwhile (e.g. in /office) isn't overwritten.
  o = (await loadOrder(id)) || o;
  o.follow = { ...(o.follow || {}), ...sent };
  o.auto = { ...(o.auto || {}), ...Object.fromEntries(Object.keys(sent).map((k) => [k, true])) };
  o.autoErr = { ...(o.autoErr || {}), ...failed };
  for (const k of Object.keys(sent)) delete o.autoErr[k];
  await saveOrder(o);
  return o;
}

// Look over recent orders for anything due. Runs at most every 10 seconds, however often it's called
// (customer status checks, /office, the verifier, /api/sweep from an outside cron).
export async function sweep() {
  try {
    const on = autoOn();
    if (!on.sms && !on.email) return;
    if (!(await kv('SET', 'sweep', '1', 'NX', 'EX', 10))) return;
    const ids = await kv('LRANGE', 'orders', 0, 499);
    const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
    const now = Date.now();
    let noMail = false; // once one email has to wait, the rest wait too — skip them this round
    for (const r of raw) { // newest first, so new customers go before the backlog
      if (!r) continue;
      const o = JSON.parse(r);
      const d = due(o, now).filter((w) => !(w === 'email' && noMail));
      if (!d.length) continue;
      followUp.mailWaiting = false;
      await followUp(o.id, { noMail });
      if (followUp.mailWaiting) noMail = true;
    }
  } catch (e) { console.error('sweep', e.message); }
}
