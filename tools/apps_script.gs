/**
 * משיט 12 – Google Sheet logger for the study app.
 * Paste this into: your Google Sheet → Extensions → Apps Script (replace everything in Code.gs) → Save.
 * Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy.
 * Copy the "Web app URL" (ends with /exec) into the app: תפריט → סנכרון לגיליון.
 *
 * Sheets created automatically:
 *   Log   – one row per answer/skip (append-only)
 *   Stats – per-question summary (menu: משיט 12 → עדכן סטטיסטיקה, or automatically on every sync)
 */
var LOG_HEADERS = ['timestamp', 'device', 'mode', 'question_id', 'source', 'question_no', 'topic', 'question', 'answered', 'correct_answer', 'result', 'seconds'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('משיט 12').addItem('עדכן סטטיסטיקה', 'rebuildStats').addToUi();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function logSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Log');
  if (!sh) { sh = ss.insertSheet('Log'); }
  if (sh.getLastRow() === 0) { sh.appendRow(LOG_HEADERS); sh.setFrozenRows(1); sh.setRightToLeft(true); }
  return sh;
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var events = body.events || [];
    if (!events.length) return json_({ ok: true, added: 0 });
    var sh = logSheet_();
    var rows = events.map(function (ev) {
      return [new Date(ev.ts || Date.now()), ev.device || '', ev.mode || '', ev.qid || '', ev.source || '', ev.n || '', ev.topic || '',
              String(ev.q || '').slice(0, 300), ev.answer || '', ev.correct || '', ev.result || '', ev.secs || ''];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, LOG_HEADERS.length).setValues(rows);
    if (body.rebuild !== false) { try { rebuildStats(); } catch (err) {} }
    return json_({ ok: true, added: rows.length, rows: sh.getLastRow() - 1 });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    if (action === 'stats') return json_({ ok: true, stats: computeStats_() });
    var sh = logSheet_();
    return json_({ ok: true, rows: Math.max(0, sh.getLastRow() - 1), sheet: SpreadsheetApp.getActiveSpreadsheet().getName() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Aggregate the Log into per-question stats: seen/right/wrong/skipped/streak (trailing correct run)/last. */
function computeStats_() {
  var sh = logSheet_();
  var n = sh.getLastRow() - 1; if (n <= 0) return {};
  var data = sh.getRange(2, 1, n, LOG_HEADERS.length).getValues();
  data.sort(function (a, b) { return new Date(a[0]) - new Date(b[0]); });
  var stats = {};
  data.forEach(function (r) {
    var qid = r[3]; if (!qid) return;
    var s = stats[qid] || (stats[qid] = { seen: 0, right: 0, wrong: 0, skipped: 0, streak: 0, last: 0, q: r[7], topic: r[6], source: r[4], n: r[5] });
    var res = r[10];
    s.seen++;
    if (res === 'right') { s.right++; s.streak++; }
    else if (res === 'wrong') { s.wrong++; s.streak = 0; }
    else if (res === 'skipped') { s.skipped++; s.streak = 0; }
    var t = new Date(r[0]).getTime(); if (t > s.last) s.last = t;
  });
  return stats;
}

/** Writes a human-readable "Stats" sheet, weakest questions first. */
function rebuildStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stats = computeStats_();
  var sh = ss.getSheetByName('Stats'); if (!sh) sh = ss.insertSheet('Stats');
  sh.clear();
  var header = ['question_id', 'source', 'no', 'topic', 'question', 'seen', 'right', 'wrong', 'skipped', 'streak', 'needs_review', 'last_seen'];
  var rows = Object.keys(stats).map(function (k) {
    var s = stats[k]; var weak = (s.wrong + s.skipped) > 0 && s.streak < 2;
    return [k, s.source, s.n, s.topic, s.q, s.seen, s.right, s.wrong, s.skipped, s.streak, weak ? 'כן' : '', s.last ? new Date(s.last) : ''];
  });
  rows.sort(function (a, b) { return (b[7] + b[8]) - (a[7] + a[8]) || b[5] - a[5]; });
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  sh.setFrozenRows(1); sh.setRightToLeft(true);
  try { sh.autoResizeColumns(1, header.length); } catch (err) {}
}
