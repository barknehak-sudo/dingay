// Automatic follow-ups: SMS through SMS Ethiopia, email through Gmail (offscriptet@gmail.com).
//   SMSETHIOPIA_KEY     — API key from smsethiopia.com → Console → API Keys (no key = no automatic SMS)
//   GMAIL_APP_PASSWORD  — Gmail app password for GMAIL_USER (no password = no automatic email)
//   GMAIL_USER          — sender address, default offscriptet@gmail.com
//   SITE_URL            — links inside messages, default https://dinguy.xyz
//   ALERT_EMAIL         — gets an email when SMS stops going through, default GMAIL_USER
// Whatever isn't sent automatically (not configured, or the send failed) stays a task in /office.
import nodemailer from 'nodemailer';
import { kv, loadOrder, saveOrder, PAY_TO } from './_lib.js';

export const SITE = (process.env.SITE_URL || 'https://dinguy.xyz').replace(/\/$/, '');
export const SW_MAIL = process.env.GMAIL_USER || 'offscriptet@gmail.com';
// TELEGRAM_LINK — invite link of the DINGUY Telegram group/channel (t.me/+…); shown in emails and after paying.
export const TG = () => (/^https:\/\/t\.me\//.test(process.env.TELEGRAM_LINK || '') ? process.env.TELEGRAM_LINK : '');
const SW_CONTACT = 'infosideways7@gmail.com'; // SIDEWAYS contact in the email footer
const SW_LINK = 'https://dinguy.xyz/#/sideways';
export const autoOn = () => ({ sms: !!process.env.SMSETHIOPIA_KEY, email: AUTO_EMAIL && !!process.env.GMAIL_APP_PASSWORD, emailReady: !!process.env.GMAIL_APP_PASSWORD, from: SW_MAIL });

export const links = (o, site = SITE) => ({ payLink: `${site}/#/pay/${o.id}/${o.key}`, recordLink: `${site}/#/registry/${o.id}/${o.key}` });
// recordLink carries the key, so whoever gets the SMS/email sees the full record and certificate.

// The texts — used for automatic sends and for the manual buttons in /office.
export function messages(o, site = SITE) {
  const am = o.lang === 'am', { payLink, recordLink } = links(o, site);
  const num = PAY_TO.phone, nm = PAY_TO.name ? ` (${PAY_TO.name})` : '';
  // With JamiDev on, buyers pay with one tap (PAY NOW → approve on the phone); otherwise the old telebirr-code steps.
  const jami = !!process.env.JAMI_TOKEN;
  const help = jami
    ? (am
      ? `ሰላም ${o.by}፣ ከDINGUY ነው 👋 ለ${o.to} ያዘዙት ${o.name} ክፍያ እየጠበቀ ነው።\nይህን ሊንክ ይክፈቱ፣ “አሁን ይክፈሉ”ን ይንኩና በስልክዎ ላይ የሚመጣውን ጥያቄ ያጽድቁ (ቴሌብር፣ M-Pesa ወይም CBE Birr)፦\n${payLink}\nጥያቄ ካለዎት፦ ${num}`
      : `Hi ${o.by}, this is DINGUY 👋 Your ${o.name} for ${o.to} is waiting for payment.\nOpen this link, tap PAY NOW and approve the request on your phone (telebirr, M-Pesa or CBE Birr):\n${payLink}\nQuestions? Call ${num}`)
    : am
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
  const tg = TG(), tgLine = tg ? (am ? `\n\nየDINGUY ቴሌግራም ቡድናችንን ይቀላቀሉ፦ ${tg}` : `\n\nJoin the DINGUY Telegram group: ${tg}`) : '';
  const foot = tgLine + (am
    ? `\n\n—\nDINGUY የSIDEWAYS ስራ ነው። ጥያቄ ካለዎት ይህን ኢሜይል ይመልሱ ወይም ይደውሉ፦ ${num}`
    : `\n\n—\nDINGUY is a SIDEWAYS project. Questions? Just reply to this email or call ${num}.`);
  // to the buyer, once paid: receipt + the private link to send to the recipient
  const buyerSubject = am ? `ደረሰኝ፦ ${o.name} ለ${o.to} ተመዝግቧል · ${o.id}` : `Receipt: ${o.name} is registered to ${o.to} · ${o.id}`;
  const buyerBody = am
    ? `ሰላም ${o.by}፣\n\nክፍያዎ ደርሷል — እናመሰግናለን! 🎉\n\n${o.to} በይፋ በ${o.name} ተመዝግቧል።\nየምዝገባ ቁ. ${o.id}\nዋጋ፦ ${o.price} ብር${o.txn ? `\nየቴሌብር ግብይት፦ ${o.txn}` : ''}\n\nየግል መዝገብና ሰርተፊኬት (መልዕክትዎን ጨምሮ)፦\n${recordLink}\n\nይህን ሊንክ ለ${o.to} ይላኩ — ሰርተፊኬቱን ማስቀመጥና በኢንስታግራም ስቶሪ ማጋራት ይችላሉ።${foot}`
    : `Hi ${o.by},\n\nYour payment is in — thank you! 🎉\n\n${o.to} is now officially registered with ${o.name}.\nRegistration No. ${o.id}\nPrice: ${o.price} Birr${o.txn ? `\ntelebirr transaction: ${o.txn}` : ''}\n\nThe private record and certificate (with your message):\n${recordLink}\n\nSend this link to ${o.to} — they can save the certificate and share it to their Instagram story.${foot}`;
  // to the buyer, if they haven't paid yet
  const helpSubject = am ? `ለ${o.to} ያዘዙት ${o.name} ክፍያ እየጠበቀ ነው` : `Your ${o.name} for ${o.to} is waiting for payment`;
  const helpBody = jami
    ? (am
      ? `ሰላም ${o.by}፣\n\nለ${o.to} ያዘዙት ${o.name} (ቁ. ${o.id}) ክፍያ እየጠበቀ ነው።\n\nይህን ሊንክ ይክፈቱ፣ “አሁን ይክፈሉ”ን ይንኩና በስልክዎ ላይ የሚመጣውን ጥያቄ ያጽድቁ — ቴሌብር፣ M-Pesa ወይም CBE Birr፦\n${payLink}${foot}`
      : `Hi ${o.by},\n\nYour ${o.name} for ${o.to} (No. ${o.id}) is waiting for payment.\n\nOpen this link, tap PAY NOW and approve the request on your phone — telebirr, M-Pesa or CBE Birr:\n${payLink}${foot}`)
    : am
    ? `ሰላም ${o.by}፣\n\nለ${o.to} ያዘዙት ${o.name} (ቁ. ${o.id}) ክፍያ እየጠበቀ ነው።\n\n1) ቴሌብርን ይክፈቱ → Send Money\n2) ${o.price} ብር ወደ ${num}${nm} ይላኩ\n3) ከ127 የመጣውን SMS ሊንክ ቀድተው እዚህ ይለጥፉ፦\n${payLink}${foot}`
    : `Hi ${o.by},\n\nYour ${o.name} for ${o.to} (No. ${o.id}) is waiting for payment.\n\n1) Open telebirr → Send Money\n2) Send ${o.price} Birr to ${num}${nm}\n3) Copy the link from the telebirr SMS (from 127) and paste it here:\n${payLink}${foot}`;
  return { help, congrats, gift, subject, body, buyerSubject, buyerBody, helpSubject, helpBody };
}

/* ---------- senders ---------- */
export async function sendSMS(phone, text) {
  const m = /^0?([79]\d{8})$/.exec(String(phone || ''));
  if (!m) throw new Error('bad phone ' + phone);
  let r;
  try {
    r = await fetch('https://smsethiopia.com/api/v2/sms/send', {
      method: 'POST',
      headers: { KEY: process.env.SMSETHIOPIA_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ msisdn: '251' + m[1], text }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    await smsAlert('SMS Ethiopia is not answering', `A text to ${phone} could not reach SMS Ethiopia (${e.message}). It is retried in 30 minutes.`);
    throw e;
  }
  const raw = await r.text();
  let j = null; try { j = JSON.parse(raw); } catch {}
  if (!r.ok || (j && (j.success === false || j.status === 'error' || j.error))) {
    console.error('smsethiopia reply', r.status, raw.slice(0, 1500));
    // Account problems (sender name not approved, no balance…) fail every SMS the same way: pause automatic SMS
    // for 6 hours instead of retrying every order every 30 minutes (each retry rewrites the order in Upstash).
    const why = String((j && (j.error_message || j.message || j.error)) || raw).slice(0, 160);
    if (/sender ?id|10006|balance|insufficient|credit|unauthori|api key|suspend/i.test(raw)) {
      smsDownUntil = Date.now() + 6 * 3600e3; await kv('SET', PAUSE_KEY(), why, 'EX', 6 * 3600);
      await smsAlert('Automatic SMS is PAUSED', `SMS Ethiopia refused the account: "${why}"\n\nNo help or congrats SMS will go out for the next 6 hours. Fix it on smsethiopia.com (balance, campaign, sender ID or API key), then send the waiting texts from /office.`, true);
    } else await smsAlert('An SMS did not go through', `SMS Ethiopia refused a text to ${phone}: "${why}"\n\nIt stays as a task in /office and is retried in 30 minutes.`);
    throw new Error(`smsethiopia ${r.status}: ${(j && (j.message || j.error || j.error_message)) || raw.slice(0, 160)}`);
  }
  console.log('smsethiopia ok', r.status, raw.slice(0, 300)); // shows in Vercel logs, so "accepted but never arrived" can be traced
  return j || raw;
}

// ALERT_EMAIL — who hears about SMS problems (default: the sending Gmail). At most one alert an hour,
// except a pause, which always alerts (it happens at most once every 6 hours).
const ALERT_TO = () => process.env.ALERT_EMAIL || SW_MAIL;
async function smsAlert(subject, text, always) {
  try {
    if (!process.env.GMAIL_APP_PASSWORD) return;
    if (!always && !(await kv('SET', 'sms:alerted', '1', 'NX', 'EX', 3600))) return;
    await sendEmail(ALERT_TO(), '⚠️ DINGUY: ' + subject, `${text}\n\n${SITE}/office`);
  } catch (e) { console.error('smsAlert', e.message); }
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
   one email every 45 s at most, 60 a day, never two of the same kind to one address within 24 h,
   and an address that fails 3 times is left for a human. */
const AUTO_EMAIL = true;
// Gmail allows ~500/day; a newer sender stays well under that, spaced out.
const MAIL_GAP_S = 45, MAIL_PER_DAY = 60, MAIL_MAX_TRIES = 3;
const MAIL_KINDS = ['email', 'buyer_email', 'help_email'];
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' });
// 'ok' = send now; 'addr' = this address had one in the last 24 h (others may go); 'wait' = nothing goes right now.
// The 24 h limit is per kind of email, so a buyer can get the help email and then their receipt.
async function mailSlot(addr, kind) {
  const to = kind + ':' + String(addr).toLowerCase();
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
const SMS_KINDS = ['help_sms', 'congrats_sms', 'to_sms'];
let smsDownUntil = 0; // set the moment SMS Ethiopia refuses the account, so the rest of this run skips SMS too
const smsDown = () => Date.now() < smsDownUntil;
// The pause belongs to the key that failed: putting a new SMSETHIOPIA_KEY in Vercel resumes SMS at once.
const PAUSE_KEY = () => 'sms:paused:' + String(process.env.SMSETHIOPIA_KEY || '').slice(-6);
export const smsPaused = () => kv('GET', PAUSE_KEY());
// SMS only for recent orders, so turning it on never texts old customers.
// Certificate emails have no age limit — every paid recipient should get theirs (paced, see above).
function due(o, now = Date.now()) {
  const f = o.follow || {}, out = [], on = autoOn();
  const age = now - o.createdAt, sincePaid = now - (o.approvedAt || o.createdAt);
  if (on.sms && o.phone && (o.status === 'awaiting' || o.status === 'rejected') && !f.help_sms && !f.help_skip && age > 30e3 && age < 24 * HOUR) out.push('help_sms');
  // Emails from offscriptet@gmail.com (paced, see mailSlot). An address that failed 3 times is left for a human.
  const tries = (k) => (((o.autoErr || {})[k] || {}).n || 0) < MAIL_MAX_TRIES;
  // Congrats/receiver SMS have no age limit: older paid orders that missed theirs catch up, 20 per 5 minutes
  // (see catchUp). A number that failed 3 times is left for a human.
  if (on.sms && o.phone && o.status === 'paid' && !f.congrats_sms && !f.congrats_skip && tries('congrats_sms')) out.push('congrats_sms');
  if (on.sms && o.toPhone && o.status === 'paid' && !f.to_sms && !f.to_skip && tries('to_sms')) out.push('to_sms');
  if (AUTO_EMAIL && on.email) {
    if (o.email && o.status === 'paid' && !f.email && !f.email_skip && tries('email')) out.push('email');
    if (o.byEmail && o.status === 'paid' && !f.buyer_email && sincePaid < 7 * 24 * HOUR && tries('buyer_email')) out.push('buyer_email');
    if (o.byEmail && (o.status === 'awaiting' || o.status === 'rejected') && !f.help_email && !f.help_skip && age > 10 * MIN && age < 24 * HOUR && tries('help_email')) out.push('help_email');
  }
  return out;
}

// Catch-up: congrats/receiver SMS for orders paid more than a day ago. Fresh ones always go at once;
// catch-up ones share 20 sends per 5-minute window.
const CATCHUP_PER_5MIN = 20;
const isCatchUp = (o, what, now = Date.now()) => (what === 'congrats_sms' || what === 'to_sms') && now - (o.approvedAt || o.createdAt) > 24 * HOUR;
const catchUpKey = () => 'sms:catchup:' + Math.floor(Date.now() / 300e3);
async function catchUpSlot() {
  const k = catchUpKey(), n = await kv('INCR', k);
  if (n === 1) await kv('EXPIRE', k, 600);
  return n <= CATCHUP_PER_5MIN;
}

// Send whatever is due for this order. Safe to call any number of times, from anywhere.
// Returns the order; `mailWaiting` is set when an email was due but has to wait for its slot.
export async function followUp(id, opts = {}) {
  let o = await loadOrder(id);
  if (!o) return null;
  const paused = opts.smsPaused !== undefined ? opts.smsPaused : await smsPaused();
  const todo = due(o).filter((w) => !(MAIL_KINDS.includes(w) && opts.noMail) && !((paused || smsDown()) && SMS_KINDS.includes(w)));
  if (!todo.length) return o;
  const m = messages(o), sent = {}, failed = {}, ids = {};
  for (const what of todo) {
    if (smsDown() && SMS_KINDS.includes(what)) continue;
    // One send per order per kind, even if two requests race. A failure retries after 30 minutes.
    if (await kv('GET', `auto:${o.id}:${what}`)) continue;
    if (isCatchUp(o, what) && !(await catchUpSlot())) continue;
    if (MAIL_KINDS.includes(what)) { const slot = await mailSlot(what === 'email' ? o.email : o.byEmail, what); if (slot !== 'ok') { if (slot === 'wait') followUp.mailWaiting = true; continue; } }
    if (!(await kv('SET', `auto:${o.id}:${what}`, '1', 'NX', 'EX', 172800))) continue;
    try {
      if (SMS_KINDS.includes(what)) ids[what] = smsRecord(await sendSMS(...smsOf(o, what, m)));
      if (what === 'email') await sendEmail(o.email, m.subject, m.body);
      if (what === 'buyer_email') await sendEmail(o.byEmail, m.buyerSubject, m.buyerBody);
      if (what === 'help_email') await sendEmail(o.byEmail, m.helpSubject, m.helpBody);
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
  o.sms = { ...(o.sms || {}), ...ids };
  await saveOrder(o);
  return o;
}

/* ---------- delivery ---------- */
// Every SMS keeps SMS Ethiopia's message id in o.sms[kind] = { id, at, st, late }. The sweep asks SMS Ethiopia
// how it went; one not confirmed DELIVERED after 30 minutes is marked `late` and shows in /office with Retry.
const LATE = 30 * MIN, WATCH = 24 * HOUR;
const smsOf = (o, what, m = messages(o)) => what === 'help_sms' ? [o.phone, m.help] : what === 'congrats_sms' ? [o.phone, m.congrats] : [o.toPhone, m.gift];
const smsRecord = (j) => ({ id: j && typeof j.id === 'string' ? j.id : null, at: Date.now(), st: (j && j.status) || 'ACCEPTED' });
const watching = (o, now = Date.now()) => Object.values(o.sms || {}).some((x) => x && x.id && x.st !== 'DELIVERED' && now - x.at < WATCH);
async function checkDelivery(o, now = Date.now()) {
  let changed = false;
  for (const [k, x] of Object.entries(o.sms || {})) {
    if (!x || !x.id || x.st === 'DELIVERED' || now - x.at > WATCH || now - x.at < 3 * MIN) continue;
    try {
      const r = await fetch('https://smsethiopia.com/api/v2/sms/' + encodeURIComponent(x.id), { headers: { KEY: process.env.SMSETHIOPIA_KEY, accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      const j = r.ok ? await r.json() : null;
      const st = j && j.status ? String(j.status) : x.st;
      const late = st !== 'DELIVERED' && now - x.at > LATE;
      if (st !== x.st || late !== !!x.late) { o.sms[k] = { ...x, st, late }; changed = true; }
    } catch (e) { console.error('sms status', o.id, k, e.message); }
  }
  return changed;
}

// Send one SMS again now, from /office (Retry). Throws SMS Ethiopia's reason if it is refused.
export async function resendSMS(id, what) {
  if (!SMS_KINDS.includes(what)) throw new Error('Unknown SMS.');
  const o = await loadOrder(id);
  if (!o) throw new Error('Order not found.');
  const [phone, text] = smsOf(o, what);
  if (!phone) throw new Error('This order has no phone number for that SMS.');
  let rec;
  try { rec = smsRecord(await sendSMS(phone, text)); }
  catch (e) {
    o.autoErr = { ...(o.autoErr || {}), [what]: { at: Date.now(), msg: String(e.message).slice(0, 200), n: (((o.autoErr || {})[what] || {}).n || 0) + 1 } };
    await saveOrder(o);
    throw e;
  }
  o.follow = { ...(o.follow || {}), [what]: Date.now() };
  o.auto = { ...(o.auto || {}), [what]: true };
  if (o.autoErr) delete o.autoErr[what];
  o.sms = { ...(o.sms || {}), [what]: rec };
  await saveOrder(o);
  return o;
}

// Look over orders that may still need a message. Runs at most once a minute, however often it's called
// (customer status checks, /office, the verifier, /api/sweep from an outside cron).
export async function sweep() {
  try {
    const on = autoOn();
    if (!on.sms && !on.email) return;
    if (!(await kv('SET', 'sweep', '1', 'NX', 'EX', 60))) return; // at most once a minute
    // Only orders that may still need a message are read (the 'fu' set, filled by saveOrder), not all of them.
    // The first run after this change fills it once from the order list.
    if (await kv('SET', 'fu:init', '1', 'NX')) { const all = await kv('LRANGE', 'orders', 0, 499); if (all.length) await kv('SADD', 'fu', ...all); }
    // Once: put every order back on the list, so paid orders that missed their congrats SMS catch up.
    if (on.sms && (await kv('SET', 'fu:catchup1', '1', 'NX'))) { const all = await kv('LRANGE', 'orders', 0, -1); if (all.length) await kv('SADD', 'fu', ...all); }
    const ids = await kv('SMEMBERS', 'fu');
    const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
    const now = Date.now(), list = [], settled = [], paused = await smsPaused();
    // While SMS is paused, SMS doesn't count as due — those orders settle instead of being re-read every minute.
    const dueNow = (o) => due(o, now).filter((w) => !(paused && SMS_KINDS.includes(w)));
    // When this window's catch-up sends are used up, those orders wait (they stay on the list) without being re-read.
    const used = async () => (+(await kv('GET', catchUpKey())) || 0) >= CATCHUP_PER_5MIN;
    let full = await used();
    raw.forEach((r, i) => { if (r) list.push(JSON.parse(r)); else settled.push(ids[i]); });
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // newest first, so new customers go before the backlog
    let noMail = false; // once one email has to wait, the rest wait too — skip them this round
    for (const o of list) {
      // Nothing due and past the first 15 minutes: nothing new can come up until the order changes (and is saved again).
      // Delivery check for SMS sent in the last day, at most every 5 minutes per order.
      if (watching(o, now)) {
        if (await kv('SET', 'dlr:' + o.id, '1', 'NX', 'EX', 280)) {
          const fresh = await loadOrder(o.id);
          if (fresh && (await checkDelivery(fresh, now))) await saveOrder(fresh);
        }
        if (!dueNow(o).length) continue; // stays on the list until delivered or a day old
      }
      if (!dueNow(o).length) { if (now - (o.createdAt || 0) > 15 * MIN) settled.push(o.id); continue; }
      const d = dueNow(o).filter((w) => !(MAIL_KINDS.includes(w) && noMail) && !(full && isCatchUp(o, w, now)));
      if (!d.length) continue;
      followUp.mailWaiting = false;
      await followUp(o.id, { noMail, smsPaused: paused });
      if (followUp.mailWaiting) noMail = true;
      if (!full && d.some((w) => isCatchUp(o, w, now))) full = await used();
    }
    if (settled.length) await kv('SREM', 'fu', ...settled);
  } catch (e) { console.error('sweep', e.message); }
}
