// Automatic follow-ups: SMS through SMS Ethiopia, email through the SIDEWAYS Gmail account.
//   SMSETHIOPIA_KEY     — API key from smsethiopia.com → Console → API Keys (no key = no automatic SMS)
//   GMAIL_APP_PASSWORD  — Gmail app password for GMAIL_USER (no password = no automatic email)
//   GMAIL_USER          — sender address, default infosideways7@gmail.com
//   SITE_URL            — links inside messages, default https://dinguy.xyz
// Whatever isn't sent automatically (not configured, or the send failed) stays a task in /office.
import nodemailer from 'nodemailer';
import { kv, loadOrder, saveOrder, PAY_TO } from './_lib.js';

export const SITE = (process.env.SITE_URL || 'https://dinguy.xyz').replace(/\/$/, '');
export const SW_MAIL = process.env.GMAIL_USER || 'infosideways7@gmail.com';
const SW_LINK = 'https://dinguy.xyz/#/sideways';
export const autoOn = () => ({ sms: !!process.env.SMSETHIOPIA_KEY, email: !!process.env.GMAIL_APP_PASSWORD, from: SW_MAIL });

export const links = (o, site = SITE) => ({ payLink: `${site}/#/pay/${o.id}/${o.key}`, recordLink: `${site}/#/registry/${o.id}` });

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
  const subject = am ? `${o.to}፣ በስምዎ ድንጋይ ተመዝግቧል` : `${o.to}, a stone has been registered in your name`;
  const body = am
    ? `ሰላም ${o.to}፣\n\n${o.by} በDINGUY መዝገብ ውስጥ ${o.name}ን በስምዎ አስመዝግበዋል።\n\n${o.message ? `“${o.message}”\n\n` : ''}የምዝገባ ቁ. ${o.id}\nመዝገብዎና ሰርተፊኬትዎ፦ ${recordLink}\n\nDINGUY® — ከልክ በላይ ትርጉም ላላቸው አጋጣሚዎች የተመዘገቡ ድንጋዮች።\nዲጂታል ምዝገባ። አካላዊ ድንጋይ አይካተትም።\n\n—\nDINGUY የSIDEWAYS ስራ ነው።\nSIDEWAYS ሰዎች ቆም ብለው፣ ደግመው አይተው እንዲያስታውሱ የሚያደርጉ ድረ-ገጾችን፣ ዘመቻዎችንና ሀሳቦችን ይሰራል።\nየእርስዎን ሀሳብ እንስራው፦ ${SW_LINK}\n${SW_MAIL} · 0996 567 218`
    : `Hi ${o.to},\n\n${o.by} has registered ${o.name} in your name with the DINGUY Registry.\n\n${o.message ? `“${o.message}”\n\n` : ''}Registration No. ${o.id}\nYour record and certificate: ${recordLink}\n\nDINGUY® — Registered stones for unreasonably meaningful occasions.\nDigital registration. No physical stone included.\n\n—\nDINGUY is a SIDEWAYS project.\nSIDEWAYS makes websites, campaigns and ideas that make people stop, look twice and remember.\nGot an idea? Let’s make people talk: ${SW_LINK}\n${SW_MAIL} · 0996 567 218`;
  return { help, congrats, subject, body };
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
    throw new Error(`smsethiopia ${r.status}: ${(j && (j.message || j.error)) || raw.slice(0, 160)}`);
  }
  return j || raw;
}

let mailer;
export async function sendEmail(to, subject, text) {
  mailer ||= nodemailer.createTransport({ service: 'gmail', auth: { user: SW_MAIL, pass: String(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, '') } });
  return mailer.sendMail({ from: `SIDEWAYS · DINGUY <${SW_MAIL}>`, replyTo: SW_MAIL, to, subject, text });
}

/* ---------- what's due ---------- */
const MIN = 60e3, HOUR = 60 * MIN;
// Only recent orders are followed up automatically, so turning this on never texts old customers.
function due(o, now = Date.now()) {
  const f = o.follow || {}, out = [], on = autoOn();
  const age = now - o.createdAt, sincePaid = now - (o.approvedAt || o.createdAt);
  if (on.sms && o.phone && (o.status === 'awaiting' || o.status === 'rejected') && !f.help_sms && !f.help_skip && age > 30e3 && age < 24 * HOUR) out.push('help_sms');
  if (on.sms && o.phone && o.status === 'paid' && !f.congrats_sms && !f.congrats_skip && sincePaid < 24 * HOUR) out.push('congrats_sms');
  if (on.email && o.email && o.status === 'paid' && !f.email && !f.email_skip && sincePaid < 24 * HOUR) out.push('email');
  return out;
}

// Send whatever is due for this order. Safe to call any number of times, from anywhere.
export async function followUp(id) {
  let o = await loadOrder(id);
  if (!o) return null;
  const todo = due(o);
  if (!todo.length) return o;
  const m = messages(o), sent = {}, failed = {};
  for (const what of todo) {
    // One send per order per kind, even if two requests race. A failure retries after 30 minutes.
    if (!(await kv('SET', `auto:${o.id}:${what}`, '1', 'NX', 'EX', 172800))) continue;
    try {
      if (what === 'help_sms') await sendSMS(o.phone, m.help);
      if (what === 'congrats_sms') await sendSMS(o.phone, m.congrats);
      if (what === 'email') await sendEmail(o.email, m.subject, m.body);
      sent[what] = Date.now();
    } catch (e) {
      console.error('auto', what, o.id, e.message);
      failed[what] = { at: Date.now(), msg: String(e.message).slice(0, 200) };
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
    const ids = await kv('LRANGE', 'orders', 0, 199);
    const raw = ids.length ? await kv('MGET', ...ids.map((i) => 'order:' + i)) : [];
    const now = Date.now();
    for (const r of raw) {
      if (!r) continue;
      const o = JSON.parse(r);
      if (due(o, now).length) await followUp(o.id);
    }
  } catch (e) { console.error('sweep', e.message); }
}
