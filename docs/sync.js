/* משיט 12 – Google Sheet sync (Apps Script web app). window.SYNC
   Events are queued in localStorage and POSTed as text/plain JSON (no CORS preflight).
   pull() reads per-question aggregates back and merges them into local stats. */
(function () {
  'use strict';
  const K = { cfg: 'ml12:sync', queue: 'ml12:syncQueue', meta: 'ml12:syncMeta' };
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const listeners = new Set();
  let flushing = false, timer = null, lastError = '';

  const cfg = () => Object.assign({ url: '', device: '' }, get(K.cfg, {}));
  const setCfg = c => { set(K.cfg, Object.assign(cfg(), c)); emit(); };
  const queue = () => get(K.queue, []);
  const meta = () => Object.assign({ lastPush: 0, lastPull: 0, pushed: 0 }, get(K.meta, {}));
  const setMeta = m => set(K.meta, Object.assign(meta(), m));
  const enabled = () => /^https:\/\/script\.google(usercontent)?\.com\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(cfg().url);
  const emit = () => listeners.forEach(fn => { try { fn(status()); } catch (e) { } });
  const status = () => {
    if (!enabled()) return { state: 'off', pending: queue().length, lastPush: meta().lastPush, lastPull: meta().lastPull, error: '' };
    if (lastError) return { state: 'error', pending: queue().length, lastPush: meta().lastPush, lastPull: meta().lastPull, error: lastError };
    if (queue().length) return { state: navigator.onLine ? 'pending' : 'offline', pending: queue().length, lastPush: meta().lastPush, lastPull: meta().lastPull, error: '' };
    return { state: 'synced', pending: 0, lastPush: meta().lastPush, lastPull: meta().lastPull, error: '' };
  };

  const deviceName = () => cfg().device || (/Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone' : 'PC');

  function push(ev) {
    const q = queue(); q.push(Object.assign({ ts: Date.now(), device: deviceName() }, ev));
    if (q.length > 5000) q.splice(0, q.length - 5000);
    set(K.queue, q); emit();
    if (enabled()) { clearTimeout(timer); timer = setTimeout(flush, 1500); }
  }

  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error('תשובה לא צפויה מהסקריפט (' + r.status + ')'); }
    if (!j.ok) throw new Error(j.error || 'שגיאה בסקריפט'); return j;
  }
  async function getJSON(url) {
    const r = await fetch(url, { method: 'GET', redirect: 'follow' });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error('תשובה לא צפויה מהסקריפט (' + r.status + ')'); }
    if (!j.ok) throw new Error(j.error || 'שגיאה בסקריפט'); return j;
  }

  async function flush() {
    if (flushing || !enabled() || !navigator.onLine) return status();
    const q = queue(); if (!q.length) { lastError = ''; emit(); return status(); }
    flushing = true; emit();
    try {
      const batch = q.slice(0, 200);
      const j = await post(cfg().url, { events: batch, rebuild: true });
      const rest = queue().slice(batch.length); set(K.queue, rest);
      setMeta({ lastPush: Date.now(), pushed: meta().pushed + (j.added || batch.length) }); lastError = '';
      flushing = false; emit();
      if (rest.length) return flush();
    } catch (e) { lastError = e.message || String(e); flushing = false; emit(); }
    return status();
  }

  async function ping() {
    if (!enabled()) throw new Error('כתובת לא תקינה – צריכה להתחיל ב-https://script.google.com/');
    const j = await getJSON(cfg().url + (cfg().url.includes('?') ? '&' : '?') + 'action=ping');
    lastError = ''; emit(); return j;
  }

  /** Read per-question aggregates from the sheet and merge into local stats via the callback. */
  async function pull(merge) {
    if (!enabled() || !navigator.onLine) return null;
    const j = await getJSON(cfg().url + (cfg().url.includes('?') ? '&' : '?') + 'action=stats');
    setMeta({ lastPull: Date.now() }); lastError = ''; emit();
    if (merge && j.stats) merge(j.stats);
    return j.stats || {};
  }

  window.addEventListener('online', () => { setTimeout(flush, 800); });
  window.SYNC = { cfg, setCfg, enabled, status, push, flush, ping, pull, queue, meta, onChange: fn => listeners.add(fn), deviceName };
})();
