/**
 * DINGUY → Google Sheet sync.
 *
 * Copies every order from dinguy.xyz into the "Orders" tab of this Google Sheet: one row per order,
 * keyed by Order ID. New orders are added at the bottom, changed orders (paid, edited, texted…) are
 * updated in place, and nothing is ever deleted — so the sheet is also a backup.
 * It remembers when it last synced and only fetches what changed since, so it never adds doubles.
 *
 * Set up (once, about 3 minutes):
 *  1. Make a new Google Sheet (sheets.new), name it "DINGUY orders".
 *  2. Extensions → Apps Script. Delete what's there, paste this whole file, click Save (💾).
 *  3. Back in the sheet, reload the page. A "DINGUY" menu appears next to Help.
 *  4. DINGUY → Set password: paste the /office admin password (it's kept in this script's private settings).
 *  5. DINGUY → Sync now. Google asks for permission the first time — allow it.
 *  6. Optional: DINGUY → Sync every morning, so it runs by itself each day at about 6:00.
 */
const SITE = 'https://dinguy.xyz';
const TAB = 'Orders', LOG = 'Sync log';

function onOpen() {
  SpreadsheetApp.getUi().createMenu('DINGUY')
    .addItem('Sync now', 'syncNow')
    .addItem('Sync every morning', 'syncDaily')
    .addSeparator()
    .addItem('Set password', 'setPassword')
    .addItem('Start over (re-download everything)', 'resetSync')
    .addToUi();
}

function setPassword() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('DINGUY', 'Paste the /office admin password:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) return;
  PropertiesService.getScriptProperties().setProperty('PASSWORD', r.getResponseText().trim());
  ui.alert('Saved. Now use DINGUY → Sync now.');
}

function resetSync() {
  PropertiesService.getScriptProperties().deleteProperty('SINCE');
  SpreadsheetApp.getUi().alert('The next sync fetches every order again (existing rows are updated, not doubled).');
}

function syncDaily() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'sync').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sync').timeBased().everyDays(1).atHour(6).inTimezone('Africa/Addis_Ababa').create();
  SpreadsheetApp.getUi().alert('Done — it will sync by itself every morning around 6:00.');
}

function syncNow() {
  const r = sync();
  SpreadsheetApp.getUi().alert(`Synced: ${r.added} new, ${r.updated} updated, ${r.total} orders in the sheet.`);
}

function sync() {
  const props = PropertiesService.getScriptProperties();
  const pw = props.getProperty('PASSWORD');
  if (!pw) throw new Error('No password yet — use DINGUY → Set password.');
  const since = Number(props.getProperty('SINCE') || 0);
  const res = UrlFetchApp.fetch(`${SITE}/api/admin?export=1&since=${since}`, { headers: { 'x-admin-password': pw }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('dinguy.xyz said ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  const data = JSON.parse(res.getContentText());

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB, 0);
  // Header row (also adds any new columns at the end if the export gains some later).
  const head = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].filter(String) : [];
  const cols = head.slice();
  data.columns.forEach((c) => { if (!cols.includes(c)) cols.push(c); });
  if (cols.length !== head.length) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#141414').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  const at = data.columns.map((c) => cols.indexOf(c));
  // Phone numbers as text, so 0911… keeps its leading 0.
  cols.forEach((c, i) => { if (/phone|transaction|Order ID/i.test(c)) sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@'); });

  // Where each Order ID already is.
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0])) : [];
  const rowOf = {};
  ids.forEach((id, i) => { rowOf[id] = i + 2; });

  let added = 0, updated = 0;
  const fresh = [];
  data.rows.forEach((r) => {
    const out = new Array(cols.length).fill('');
    r.forEach((v, i) => { out[at[i]] = v; });
    const n = rowOf[r[0]];
    if (n) { sh.getRange(n, 1, 1, cols.length).setValues([out]); updated++; }
    else { fresh.push(out); rowOf[r[0]] = -1; }
  });
  if (fresh.length) { sh.getRange(sh.getLastRow() + 1, 1, fresh.length, cols.length).setValues(fresh); added = fresh.length; }

  // Colour the Status column so paid / not paid stand out.
  const st = cols.indexOf('Status') + 1, total = sh.getLastRow() - 1;
  if (st && total > 0 && added) {
    const rules = [['Paid', '#e3f4ea', '#1e8a50'], ['Not paid', '#f4f4f1', '#4f4f4b'], ['Payment being checked', '#fdf1d8', '#a96a00'], ['Payment rejected', '#fde6e2', '#c4321f']]
      .map(([t, bg, fg]) => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setBackground(bg).setFontColor(fg).setRanges([sh.getRange(2, st, total, 1)]).build());
    sh.setConditionalFormatRules(rules);
  }
  if (added && sh.getLastRow() < 400) sh.autoResizeColumns(1, Math.min(cols.length, 12));

  // Next time: only what changed after this sync (a minute of overlap is harmless — rows are matched by ID).
  props.setProperty('SINCE', String(data.now - 60000));
  const log = ss.getSheetByName(LOG) || ss.insertSheet(LOG);
  if (!log.getLastRow()) log.appendRow(['When', 'New orders', 'Updated', 'Orders in sheet', 'Full download']);
  log.appendRow([new Date(), added, updated, total, data.full ? 'yes' : '']);
  return { added, updated, total };
}
