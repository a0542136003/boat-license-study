/* משיט 12 – study app v7. Vanilla JS, RTL, offline-first, question-first. */
(function () {
  'use strict';
  const HEB = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const app = $('#app');
  let DB = null;
  const IMG = window.__IMAGES__ || null;
  const SYNC = window.SYNC || null;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ml12:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ml12:' + k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem('ml12:' + k); } catch (e) { } }
  };
  const icon = (n, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const imgSrc = n => IMG ? IMG[`p${String(n).padStart(2, '0')}.jpg`] : `pdf/p${String(n).padStart(2, '0')}.jpg`;
  const qimg = q => q.img ? `<div class="qimgwrap"><img class="qimg" loading="lazy" src="${IMG ? (IMG[q.img.split('/').pop()] || q.img) : q.img}" alt="תרשים"></div>` : '';
  const srcLabel = q => q.source === 'pdf' ? `חוברת עמ' ${q.page || ''}` : `מבחן ${q.course} · ${q.n}`;
  const fmtTime = t => t ? new Date(t).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
  let toastT; const toast = (msg, ms = 2400) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); };

  // ---------- theme ----------
  const applyTheme = t => { document.documentElement.setAttribute('data-theme', t); store.set('theme', t); const u = $('#themeBtn use'); if (u) u.setAttribute('href', t === 'dark' ? '#i-sun' : '#i-moon'); };
  applyTheme(store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('#themeBtn').onclick = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  // drawer
  const drawer = $('#drawer'), scrim = $('#scrim');
  const openDrawer = o => { drawer.classList.toggle('open', o); scrim.classList.toggle('open', o); };
  $('#menuBtn').onclick = () => openDrawer(true); $('#drawerClose').onclick = () => openDrawer(false); scrim.onclick = () => openDrawer(false);
  drawer.addEventListener('click', e => { if (e.target.closest('a')) openDrawer(false); });
  $('#syncBtn').onclick = () => { location.hash = '#/sync'; };

  // ---------- stats & recording ----------
  const stats = () => store.get('stats', {});
  const saveStats = s => store.set('stats', s);
  const isWeak = r => !!r && (r.wrong + (r.skipped || 0)) > 0 && r.streak < 2;
  const isMastered = r => !!r && r.box >= 3;
  /** result: 'right' | 'wrong' | 'skipped'. ctx: {mode, q, pick, secs} */
  function record(q, result, ctx = {}) {
    const s = stats(); const r = s[q.id] || { seen: 0, right: 0, wrong: 0, skipped: 0, streak: 0, box: 0 };
    r.seen++;
    if (result === 'right') { r.right++; r.streak++; r.box = Math.min(5, r.box + 1); }
    else if (result === 'wrong') { r.wrong++; r.streak = 0; r.box = 0; }
    else { r.skipped = (r.skipped || 0) + 1; r.streak = 0; r.box = 0; }
    r.last = Date.now(); s[q.id] = r; saveStats(s); refreshWeakPill();
    if (SYNC) SYNC.push({ mode: ctx.mode || 'practice', qid: q.id, source: q.source, n: q.n, topic: q.topic, q: q.q, answer: ctx.pick != null ? HEB[ctx.pick] : '', correct: HEB[q.correct], result, secs: ctx.secs || '' });
  }
  function mergeRemote(remote) {
    const s = stats(); let changed = 0;
    Object.keys(remote).forEach(id => { const rr = remote[id]; const l = s[id]; if (!l || rr.seen > l.seen) { s[id] = { seen: rr.seen, right: rr.right, wrong: rr.wrong, skipped: rr.skipped || 0, streak: rr.streak, box: Math.min(5, rr.streak), last: rr.last || 0 }; changed++; } });
    if (changed) { saveStats(s); refreshWeakPill(); }
    return changed;
  }
  const weakCount = () => DB ? DB.questions.filter(q => isWeak(stats()[q.id])).length : 0;
  function refreshWeakPill() { const p = $('#weakPill'); if (!p) return; const n = weakCount(); p.hidden = !n; p.textContent = n; }
  const setTitle = (t, crumb = '') => { $('#title').textContent = t; $('#crumb').textContent = crumb; document.title = t + ' – משיט 12'; };

  // ---------- speech (TTS + recognition) ----------
  const TTS = {
    ok: 'speechSynthesis' in window, voices: [], voice: null,
    load() { if (!this.ok) return; this.voices = speechSynthesis.getVoices(); const pref = store.get('voiceURI', null); this.voice = this.voices.find(v => v.voiceURI === pref) || this.voices.find(v => /^he/i.test(v.lang)) || this.voices.find(v => /hebrew|עברית/i.test(v.name)) || null; },
    hebrew() { return this.voices.filter(v => /^he/i.test(v.lang) || /hebrew|עברית/i.test(v.name)); },
    warm() { if (!this.ok) return; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { } },
    speak(text) {
      return new Promise(res => {
        if (!this.ok || !text) return res();
        const u = new SpeechSynthesisUtterance(clean4tts(text)); u.lang = 'he-IL'; if (this.voice) u.voice = this.voice;
        u.rate = +store.get('rate', 1); u.pitch = 1; let done = false; const fin = () => { if (!done) { done = true; clearInterval(t); res(); } };
        u.onend = fin; u.onerror = fin; speechSynthesis.speak(u);
        const t = setInterval(() => { if (!speechSynthesis.speaking && !speechSynthesis.pending) fin(); }, 400);
        setTimeout(fin, 60000);
      });
    },
    cancel() { if (this.ok) speechSynthesis.cancel(); }
  };
  const clean4tts = s => String(s).replace(/ק["״]ג/g, 'קילוגרם').replace(/ס["״]מ/g, 'סנטימטר').replace(/מ["״]מ/g, 'מילימטר').replace(/ק["״]מ/g, 'קילומטר').replace(/(\d)\s*מ['׳](?![א-ת])/g, '$1 מטר').replace(/ת["״]ז/g, 'תעודת זהות').replace(/ע["״]י/g, 'על ידי').replace(/ראשל["״]צ/g, 'ראשון לציון').replace(/ת["״]א/g, 'תל אביב').replace(/כ["״]ש/g, 'כלי שיט').replace(/רספ["״]ן/g, 'רספן').replace(/אחה["״]צ/g, 'אחר הצהריים').replace(/מס['׳]/g, 'מספר').replace(/["'״׳]/g, '').replace(/\(([^)]*)\)/g, ', $1,').replace(/\s*[-–]\s*/g, ', ').replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').replace(/\s+\./g, '.').trim();
  if (TTS.ok) { TTS.load(); speechSynthesis.onvoiceschanged = () => TTS.load(); }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  function listen(ms) {
    return new Promise(res => {
      if (!SR) return res(null);
      let r; try { r = new SR(); } catch (e) { return res(null); }
      r.lang = 'he-IL'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
      let done = false; const fin = v => { if (done) return; done = true; clearTimeout(t); try { r.abort(); } catch (e) { } res(v); };
      r.onresult = e => { const alts = []; for (const rs of e.results) for (const a of rs) alts.push(a.transcript); fin(alts); };
      r.onerror = () => fin(null); r.onend = () => fin(null);
      const t = setTimeout(() => fin(null), ms);
      try { r.start(); } catch (e) { fin(null); }
    });
  }
  const WORDS = { 'א': 0, 'אלף': 0, 'אחת': 0, 'אחד': 0, '1': 0, 'ראשונה': 0, 'ראשון': 0, 'הראשונה': 0, 'ב': 1, 'בית': 1, 'שתיים': 1, 'שניים': 1, 'שתים': 1, '2': 1, 'שנייה': 1, 'שניה': 1, 'שני': 1, 'השנייה': 1, 'ג': 2, 'גימל': 2, 'שלוש': 2, 'שלושה': 2, '3': 2, 'שלישית': 2, 'שלישי': 2, 'השלישית': 2, 'ד': 3, 'דלת': 3, 'ארבע': 3, 'ארבעה': 3, '4': 3, 'רביעית': 3, 'רביעי': 3, 'הרביעית': 3 };
  const CMDS = [[/חזור|שוב|תחזור|עוד פעם|לא שמעתי/, 'repeat'], [/הבא|דלג|תדלג|הלאה|נקסט/, 'skip'], [/עצור|תעצור|סיום|סיים|תפסיק|הפסק|סטופ/, 'stop'], [/השהה|הפסקה|פאוזה|רגע/, 'pause']];
  function parseSpeech(alts) {
    if (!alts) return null;
    for (const raw of alts) {
      const s = raw.replace(/[.,!?״"']/g, ' ').replace(/תשובה|אופציה|מספר|אות|בחר|אני בוחר|אני אומר/g, ' ').trim();
      for (const [re, c] of CMDS) if (re.test(s)) return { cmd: c };
      if (s in WORDS) return { pick: WORDS[s] };
      const words = s.split(/\s+/); for (const w of words) { const ww = w.replace(/^ו/, ''); if (w in WORDS) return { pick: WORDS[w] }; if (ww in WORDS) return { pick: WORDS[ww] }; }
    }
    return { unknown: alts[0] };
  }
  let wakeLock = null;
  const keepAwake = async on => { try { if (on && 'wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; } } catch (e) { } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wakeLock) keepAwake(true); });
  const speakQuestion = async q => { TTS.cancel(); await TTS.speak(spoken(q.q)); for (let i = 0; i < q.options.length; i++) await TTS.speak(`${HEB[i]}. ${spoken(q.options[i])}`); };

  // ---------- exam pictures (pics.js) ----------
  const PICS = window.PICS || null;
  const PIC_RE = /תמונ(?:ה|ות)\s*(\d+)((?:\s*(?:ו\s*-?\s*|–|-|,|\/)\s*\d+)*)/g;
  const picsIn = str => { const out = []; let m; PIC_RE.lastIndex = 0; while ((m = PIC_RE.exec(str))) { out.push(+m[1]); (m[2] || '').replace(/\d+/g, d => { out.push(+d); return d; }); } return out; };
  const KEYPICS = [
    [/מעו?יי?ן שחור/, 'shape:diamond'], [/שני כדורים/, 'shape:ball2'], [/שלושה כדורים/, 'shape:ball3'], [/כדור שחור על גג|כדור שחור על מנהלת|כדור שחור המונף מעל מנהלת/, 'misc:blackBall'],
    [/כדור שחור (בחרטום|בקדמת|אחד)|כדור שחור המונף בקדמת/, 'shape:ball1'], [/שני חרוטים|שני משולשים שחורים/, 'shape:hourglass'], [/חרוט שחור שקודקודו כלפי מטה/, 'shape:coneDown'],
    [/כדור.{0,6}מעו?יי?ן.{0,6}כדור/, 'shape:ram'], [/גליל שחור/, 'shape:cyl'], [/נס אדום/, 'misc:redPennant'], [/דגל צוללים/, 'flag:A'], [/אור לבן מעל (אור )?ירוק/, 'misc:whiteGreen'],
    [/חמש (או יותר )?צפירות קצרות|5 צפירות קצרות/, 'sound:s5'], [/3 קצרות,? 3 ארוכות|שלוש צפירות קצרות, שלוש ארוכות/, 'sound:sos']
  ];
  const picTag = (key, n, cls = 'inpic') => { if (!PICS) return ''; const svg = PICS.svg(key); if (!svg) return ''; return `<span class="${cls}" title="${n != null ? 'תמונה ' + n : ''}">${svg}${n != null ? `<small>${n}</small>` : ''}</span>`; };
  const rich = (text, { keywords = true } = {}) => {
    let h = esc(text); let hadPic = false;
    if (PICS) {
      h = h.replace(PIC_RE, (m, first, rest) => { const nums = [+first, ...((rest || '').match(/\d+/g) || []).map(Number)]; const known = nums.filter(n => PICS.byNumber(n)); if (!known.length) return m; hadPic = true; return nums.map(n => PICS.byNumber(n) ? picTag(PICS.byNumber(n).key, n) : `תמונה ${n}`).join(' '); });
      if (keywords && !hadPic) { for (const [re, key] of KEYPICS) { if (key && re.test(text)) { h = picTag(key, null) + ' ' + h; break; } } }
    }
    return h;
  };
  const spoken = text => !PICS ? text : String(text).replace(PIC_RE, m => m.replace(/\d+/g, d => { const p = PICS.byNumber(+d); return p && p.info.desc ? `${d}, ${p.info.desc},` : d; }));
  const fillPics = root => { if (!PICS) return; $$('[data-pic]', root).forEach(el => { el.innerHTML = PICS.svg(el.dataset.pic); el.classList.add('picsvg'); }); $$('[data-picn]', root).forEach(el => { const p = PICS.byNumber(+el.dataset.picn); if (p) { el.innerHTML = p.svg; el.classList.add('picsvg'); } }); };
  const picLegend = q => { if (!PICS) return ''; const ns = [...new Set(picsIn(q.q + ' ' + q.options.join(' ')))].filter(n => PICS.byNumber(n)); if (!ns.length) return ''; return `<div class="piclegend">${ns.map(n => `<span><b>${n}</b> ${esc(PICS.byNumber(n).info.he)}</span>`).join('')}</div>`; };

  // ---------- question card ----------
  /** opts: {index,total,onAnswer(pick,ok),onSkip(),showAnswer,immediate,picked} → element with .reveal(pick|null) */
  function renderQuestion(q, opts = {}) {
    const { index, total, onAnswer, onSkip, showAnswer } = opts;
    const div = document.createElement('div'); div.className = 'qcard question';
    const s = stats()[q.id];
    div.innerHTML = `<div class="qmeta"><span>${index != null ? `שאלה <b>${index + 1}</b>${total ? ` / ${total}` : ''}` : esc(srcLabel(q))}</span>
        <span class="tags">${TTS.ok ? `<button class="ib speakbtn" title="הקרא" aria-label="הקרא">${icon('volume')}</button>` : ''}<span class="tag">${esc(q.topic)}</span>${index != null ? `<span class="tag">${esc(srcLabel(q))}</span>` : ''}${s && isWeak(s) ? '<span class="tag bad">לחיזוק</span>' : ''}</span></div>
      <div class="qtext">${rich(q.q)}</div>${qimg(q)}${showAnswer ? picLegend(q) : ''}
      <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}" style="--i:${i}"><span class="letter">${HEB[i]}</span><span class="otext">${rich(o)}</span></button>`).join('')}</div>
      <div class="feedback"></div>`;
    const buttons = $$('.opt', div); let done = false;
    const reveal = (picked, kind) => {
      if (done) return; done = true;
      buttons.forEach(b => { b.disabled = true; const i = +b.dataset.i; if (i === q.correct) b.classList.add('correct'); if (picked === i && i !== q.correct) b.classList.add('wrong'); if (picked === i) b.classList.add('picked'); });
      const ok = picked === q.correct;
      if (!$('.piclegend', div)) $('.qtext', div).insertAdjacentHTML('afterend', picLegend(q));
      const head = kind === 'skip' ? `<b>${icon('eye')} התשובה</b>` : picked == null ? `<b>לא נענתה</b>` : ok ? `<b>${icon('check')} נכון</b>` : `<b>${icon('x')} לא נכון</b>`;
      $('.feedback', div).innerHTML = `<div class="why ${kind === 'skip' || picked == null ? 'neutral' : ok ? '' : 'bad'}">${head} · <b>${HEB[q.correct]}.</b> ${esc(q.options[q.correct])}${q.why ? `<div class="small" style="margin-top:6px">${esc(q.why)}</div>` : ''}</div>`;
    };
    div.reveal = reveal;
    if (showAnswer) reveal(opts.picked != null ? opts.picked : null, opts.picked != null ? 'answer' : 'static');
    const sb = $('.speakbtn', div); if (sb) sb.onclick = () => { TTS.warm(); speakQuestion(q); };
    buttons.forEach(b => b.onclick = () => { const i = +b.dataset.i; if (opts.immediate !== false) reveal(i, 'answer'); else { buttons.forEach(x => x.classList.remove('picked')); b.classList.add('picked'); } onAnswer && onAnswer(i, i === q.correct); });
    div.pick = i => { const b = buttons[i]; if (b && !b.disabled) b.click(); };
    div.skip = () => { if (done) return; reveal(null, 'skip'); onSkip && onSkip(); };
    return div;
  }

  // ---------- practice session (practice / mistakes / resume) ----------
  function runSession(questions, { title, backHash, mode = 'practice', startAt = 0, crumb = '' }) {
    setTitle(title, crumb);
    let i = startAt, right = 0, wrong = 0, skipped = 0; const review = []; let t0 = Date.now();
    const ids = questions.map(q => q.id);
    const saveResume = () => store.set('resume', { ids, i, title, backHash, mode, crumb, at: Date.now() });
    const wrap = document.createElement('div'); wrap.className = 'qwrap';
    let keyHandler = null;
    const cleanup = () => { if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; } };
    const render = () => {
      cleanup(); wrap.innerHTML = '';
      if (i >= questions.length) {
        store.del('resume'); refreshWeakPill();
        const done = right + wrong + skipped || 1;
        wrap.innerHTML = `<div class="panel raised"><h2>סיימת את הסבב</h2>
          <div class="result"><div><b class="ok-text">${right}</b><span>נכון</span></div><div><b class="bad-text">${wrong}</b><span>לא נכון</span></div><div><b>${skipped}</b><span>דילוגים</span></div></div>
          <div class="bar"><i style="width:${Math.round(100 * right / done)}%"></i></div>
          <div class="row" style="margin-top:14px"><a class="btn" href="${backHash}">${icon('refresh')} סבב נוסף</a>${review.length ? `<a class="btn ghost" href="#/mistakes">לחיזוק (${weakCount()})</a>` : ''}<a class="btn ghost" href="#/">בית</a></div></div>
          ${review.length ? `<h3>לחזרה מהסבב הזה</h3>` : ''}`;
        review.forEach(q => wrap.appendChild(renderQuestion(q, { showAnswer: true })));
        return;
      }
      saveResume();
      const q = questions[i]; t0 = Date.now();
      wrap.insertAdjacentHTML('beforeend', `<div class="qbar"><div class="bar"><i style="width:${100 * i / questions.length}%"></i></div></div>`);
      const finish = () => { $('#nextBtn', wrap).disabled = false; $('#skipBtn', wrap).disabled = true; $('#nextBtn', wrap).focus(); };
      const card = renderQuestion(q, {
        index: i, total: questions.length,
        onAnswer: (pick, ok) => { record(q, ok ? 'right' : 'wrong', { mode, pick, secs: Math.round((Date.now() - t0) / 1000) }); if (ok) right++; else { wrong++; review.push(q); } finish(); },
        onSkip: () => { record(q, 'skipped', { mode, secs: Math.round((Date.now() - t0) / 1000) }); skipped++; review.push(q); finish(); }
      });
      wrap.appendChild(card);
      const bar = document.createElement('div'); bar.className = 'actions';
      bar.innerHTML = `<button class="btn ghost" id="skipBtn">${icon('eye')} דלג – הצג תשובה</button><button class="btn" id="nextBtn" disabled>${i === questions.length - 1 ? 'סיום' : 'הבא'} ${icon('chev-l')}</button>`;
      wrap.appendChild(bar);
      $('#skipBtn', bar).onclick = () => card.skip();
      $('#nextBtn', bar).onclick = () => { i++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      const hint = document.createElement('div'); hint.className = 'muted small center'; hint.style.marginTop = '10px';
      hint.innerHTML = `<span class="kbd">1</span>–<span class="kbd">4</span> לבחירה · <span class="kbd">S</span> דלג · <span class="kbd">Enter</span> הבא · <a href="${backHash}">יציאה</a>`;
      wrap.appendChild(hint);
      keyHandler = e => { if (e.target && e.target.matches && e.target.matches('input,textarea,select')) return; const k = e.key; const map = { '1': 0, '2': 1, '3': 2, '4': 3, 'א': 0, 'ב': 1, 'ג': 2, 'ד': 3 }; if (k in map) { card.pick(map[k]); e.preventDefault(); } else if (k === 'Enter' || k === ' ') { if (!$('#nextBtn', wrap).disabled) { $('#nextBtn', wrap).click(); e.preventDefault(); } } else if (k === 's' || k === 'S' || k === 'ד' && e.altKey) { card.skip(); } };
      document.addEventListener('keydown', keyHandler);
    };
    render();
    const onHash = () => { cleanup(); window.removeEventListener('hashchange', onHash); };
    window.addEventListener('hashchange', onHash);
    return wrap;
  }
  const poolBy = (src, topics, only) => {
    const s = stats(); let qs = DB.questions.slice();
    if (src === 'course') qs = qs.filter(q => q.source !== 'pdf'); else if (src === 'pdf') qs = qs.filter(q => q.source === 'pdf');
    if (topics && topics.length) qs = qs.filter(q => topics.includes(q.topic));
    if (only === 'new') qs = qs.filter(q => !s[q.id]); else if (only === 'unmastered') qs = qs.filter(q => !isMastered(s[q.id]));
    return qs;
  };

  // ---------- views ----------
  const views = {};
  views.home = () => {
    setTitle('משיט 12');
    const s = stats(); const seen = DB.questions.filter(q => s[q.id]).length; const weak = weakCount();
    const mastered = DB.questions.filter(q => isMastered(s[q.id])).length; const total = DB.counts.total;
    const exams = store.get('exams', []); const last = exams[exams.length - 1]; const resume = store.get('resume', null);
    const pct = Math.round(100 * mastered / total); const C = 2 * Math.PI * 46;
    const byTopic = {}; DB.questions.forEach(q => { const t = byTopic[q.topic] = byTopic[q.topic] || { n: 0, weak: 0 }; t.n++; if (isWeak(s[q.id])) t.weak++; });
    const weakest = Object.entries(byTopic).filter(([, v]) => v.weak).sort((a, b) => b[1].weak - a[1].weak).slice(0, 5);
    const modes = [
      ['mistakes', 'refresh', 'לחיזוק', weak ? `${weak} שאלות שטעית או דילגת עליהן` : 'אין שאלות פתוחות – כל הכבוד'],
      ['exam', 'clock', 'סימולציית מבחן', 'שאלות אקראיות, טיימר, ציון בסוף'],
      ['drive', 'car', 'מצב נהיגה', 'הקראה קולית ומענה בקול, בלי ידיים'],
      ['lessons', 'book', 'שיעורים', 'החומר מהחוברת לפי נושאים'],
      ['pics', 'flag', 'דגלים וסימנים', 'דגלי קוד, סימני יום, אורות ואותות'],
      ['browse', 'list', 'כל השאלות והתשובות', `${total} שאלות עם הסבר`],
    ];
    return `<div class="grid2"><div>
      <section class="hero"><h1>${resume ? 'להמשיך מאיפה שעצרת?' : 'בוא נתרגל שאלות'}</h1>
        <p class="lead">${resume ? `${esc(resume.title)} · שאלה ${resume.i + 1} מתוך ${resume.ids.length}` : `${total} שאלות מהמבחנים ומהחוברת, עם הסבר לכל תשובה.`}</p>
        <div class="row">${resume ? `<a class="btn lg" href="#/resume">${icon('play')} המשך תרגול</a><a class="btn ghost" href="#/practice">תרגול חדש</a>` : `<a class="btn lg" href="#/practice/go">${icon('play')} תרגול מהיר</a><a class="btn ghost" href="#/practice">בחירת נושא</a>`}</div>
        <div class="metrics"><div><b>${seen}</b><span>נראו</span></div><div><b>${mastered}</b><span>נשלטות</span></div><div><b class="${weak ? 'bad-text' : ''}">${weak}</b><span>לחיזוק</span></div><div><b>${last ? last.score + '%' : '–'}</b><span>מבחן אחרון</span></div></div>
        <div class="bar"><i style="width:${pct}%"></i></div></section>
      <ul class="modes divide">${modes.map(([h, ic, t, d]) => `<li><a href="#/${h}"><span class="ic">${icon(ic)}</span><span><b>${t}</b><small>${d}</small></span><span class="arrow">${icon('chev-l')}</span></a></li>`).join('')}</ul>
    </div>
    <aside class="panel"><div class="ring"><svg viewBox="0 0 110 110"><circle class="bgc" cx="55" cy="55" r="46"/><circle class="fgc" cx="55" cy="55" r="46" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg><div class="val">${pct}%<small>נשלטות</small></div></div>
      <p class="muted small center">שאלה נחשבת "נשלטת" אחרי 3 תשובות נכונות ברצף.</p>
      ${weakest.length ? `<h3>נושאים לחיזוק</h3><ul class="weaklist">${weakest.map(([t, v]) => `<li><a href="#/practice/${encodeURIComponent(t)}">${esc(t)}</a><span class="n">${v.weak}</span></li>`).join('')}</ul>` : ''}
      ${SYNC && !SYNC.enabled() ? `<div class="section small"><b>גיליון Google</b><br><span class="muted">חבר גיליון כדי לשמור את ההיסטוריה ולעבור בין מכשירים.</span><br><a class="btn sm soft" style="margin-top:8px" href="#/sync">${icon('cloud')} הגדרת סנכרון</a></div>` : ''}
    </aside></div>`;
  };

  views.resume = () => {
    const r = store.get('resume', null); if (!r) { location.hash = '#/practice'; return ''; }
    const byId = Object.fromEntries(DB.questions.map(q => [q.id, q])); const qs = r.ids.map(id => byId[id]).filter(Boolean);
    return runSession(qs, { title: r.title, backHash: r.backHash || '#/practice', mode: r.mode || 'practice', startAt: Math.min(r.i, qs.length - 1), crumb: r.crumb || '' });
  };

  views.practice = (arg) => {
    const cfg = Object.assign({ n: 15, src: 'all', only: 'all' }, store.get('practiceCfg', {}));
    if (arg) {
      const topics = arg === 'go' ? [] : decodeURIComponent(arg).split('|');
      let qs = poolBy(cfg.src, topics, cfg.only); if (!qs.length) qs = poolBy(cfg.src, topics, 'all'); if (!qs.length) qs = DB.questions.slice();
      const label = topics.length ? topics.join(', ') : 'כל הנושאים';
      return runSession(shuffle(qs).slice(0, cfg.n), { title: 'תרגול', crumb: label, backHash: '#/practice', mode: 'practice' });
    }
    setTitle('תרגול');
    const s = stats(); const counts = {}; DB.questions.forEach(q => { const c = counts[q.topic] = counts[q.topic] || { n: 0, weak: 0, m: 0 }; c.n++; if (isWeak(s[q.id])) c.weak++; if (isMastered(s[q.id])) c.m++; });
    const chip = (name, val, label, cur) => `<button class="chip ${cur === val ? 'on' : ''}" data-k="${name}" data-v="${val}">${label}</button>`;
    const html = `<div class="panel">
      <div class="field"><label>כמה שאלות בסבב</label><div class="row">${[10, 15, 25, 50].map(n => chip('n', n, n, cfg.n)).join('')}</div></div>
      <div class="field"><label>מקור</label><div class="row">${chip('src', 'all', 'הכול', cfg.src)}${chip('src', 'course', 'מבחני הקורס', cfg.src)}${chip('src', 'pdf', 'שאלות החוברת', cfg.src)}</div></div>
      <div class="field"><label>אילו שאלות</label><div class="row">${chip('only', 'all', 'כל השאלות', cfg.only)}${chip('only', 'unmastered', 'רק מה שעוד לא נשלט', cfg.only)}${chip('only', 'new', 'רק שאלות חדשות', cfg.only)}</div></div>
      <a class="btn lg block" href="#/practice/go">${icon('play')} התחל – כל הנושאים</a></div>
      <h3>או לפי נושא</h3>
      <ul class="topics panel" style="padding:4px 12px">${DB.topics.map(t => `<li><a href="#/practice/${encodeURIComponent(t)}"><span class="t">${esc(t)}</span><span class="tag">${counts[t].n}</span><span class="m"><span class="bar"><i style="width:${100 * counts[t].m / counts[t].n}%"></i></span>${counts[t].m} נשלטות${counts[t].weak ? ` · <span class="bad-text">${counts[t].weak} לחיזוק</span>` : ''}</span></a></li>`).join('')}</ul>`;
    setTimeout(() => { $$('.chip[data-k]').forEach(b => b.onclick = () => { const c = Object.assign({}, cfg); c[b.dataset.k] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; store.set('practiceCfg', c); route(); }); }, 0);
    return html;
  };

  views.mistakes = (filter = 'all') => {
    setTitle('לחיזוק');
    const s = stats();
    const sets = { all: DB.questions.filter(q => isWeak(s[q.id])), wrong: DB.questions.filter(q => s[q.id] && s[q.id].wrong > 0 && s[q.id].streak < 2), skipped: DB.questions.filter(q => s[q.id] && (s[q.id].skipped || 0) > 0 && s[q.id].streak < 2), new: DB.questions.filter(q => !s[q.id]) };
    const list = sets[filter] || sets.all;
    const chips = [['all', 'הכול'], ['wrong', 'טעויות'], ['skipped', 'דילוגים'], ['new', 'טרם נראו']].map(([k, l]) => `<a class="chip ${filter === k ? 'on' : ''}" href="#/mistakes/${k}">${l} <span class="n">${sets[k].length}</span></a>`).join('');
    if (!list.length) return `<div class="filters">${chips}</div><div class="panel empty">${icon('check')}<h2>אין כאן כלום</h2><p>${filter === 'new' ? 'ראית כבר את כל השאלות.' : 'שאלה יוצאת מהרשימה אחרי שעונים עליה נכון פעמיים ברצף.'}</p><a class="btn" href="#/practice">לתרגול</a></div>`;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="filters">${chips}</div><div class="panel between"><div><b>${list.length} שאלות</b><div class="muted small">סדר אקראי · תשובה נכונה פעמיים ברצף מוציאה שאלה מהרשימה</div></div><a class="btn" href="#/mistakes/${filter}/go">${icon('play')} התחל</a></div>
      <ul class="list">${list.slice(0, 60).map(q => `<li><span class="muted small">${esc(srcLabel(q))} · ${esc(q.topic)}</span><br>${rich(q.q, { keywords: false })}${s[q.id] ? ` <span class="tag bad">${s[q.id].wrong} טעויות · ${s[q.id].skipped || 0} דילוגים</span>` : ''}</li>`).join('')}${list.length > 60 ? `<li class="muted">ועוד ${list.length - 60}…</li>` : ''}</ul>`;
    return wrap;
  };
  views.mistakes.go = (filter) => {
    const s = stats(); const sets = { all: DB.questions.filter(q => isWeak(s[q.id])), wrong: DB.questions.filter(q => s[q.id] && s[q.id].wrong > 0 && s[q.id].streak < 2), skipped: DB.questions.filter(q => s[q.id] && (s[q.id].skipped || 0) > 0 && s[q.id].streak < 2), new: DB.questions.filter(q => !s[q.id]) };
    const list = sets[filter] || sets.all; if (!list.length) { location.hash = '#/mistakes'; return ''; }
    return runSession(shuffle(list).slice(0, 50), { title: 'לחיזוק', crumb: { all: 'הכול', wrong: 'טעויות', skipped: 'דילוגים', new: 'טרם נראו' }[filter] || '', backHash: '#/mistakes/' + filter, mode: 'review' });
  };

  views.exam = (state) => {
    setTitle('סימולציית מבחן');
    const cfg = store.get('examCfg', { n: 30, min: 40, pass: 70, src: 'all' });
    if (state !== 'go') {
      const exams = store.get('exams', []);
      const html = `<div class="panel"><h2>הגדרות</h2><p class="muted small">התשובות נבדקות רק בסיום – כמו במבחן האמיתי. אפשר לדפדף בין השאלות.</p>
        <div class="fields"><div class="field"><label>מספר שאלות</label><input type="number" id="en" min="5" max="150" value="${cfg.n}"></div>
        <div class="field"><label>דקות</label><input type="number" id="em" min="5" max="180" value="${cfg.min}"></div>
        <div class="field"><label>ציון עובר (%)</label><input type="number" id="ep" min="50" max="100" value="${cfg.pass}"></div>
        <div class="field"><label>מקור</label><select id="es"><option value="all" ${cfg.src === 'all' ? 'selected' : ''}>הכול</option><option value="course" ${cfg.src === 'course' ? 'selected' : ''}>מבחני הקורס</option><option value="pdf" ${cfg.src === 'pdf' ? 'selected' : ''}>שאלות החוברת</option></select></div></div>
        <button class="btn lg" id="startExam">${icon('play')} התחל מבחן</button></div>
        ${exams.length ? `<div class="panel"><h3 style="margin-top:0">מבחנים קודמים</h3><ul class="list">${exams.slice(-10).reverse().map(e => `<li class="between"><span>${new Date(e.at).toLocaleString('he-IL')} · ${e.right}/${e.n}</span><span class="tag ${e.score >= e.pass ? 'ok' : 'bad'}">${e.score}% ${e.score >= e.pass ? 'עבר' : 'נכשל'}</span></li>`).join('')}</ul></div>` : ''}`;
      setTimeout(() => { $('#startExam').onclick = () => { store.set('examCfg', { n: +$('#en').value || 30, min: +$('#em').value || 40, pass: +$('#ep').value || 70, src: $('#es').value }); location.hash = '#/exam/go'; }; }, 0);
      return html;
    }
    let pool = poolBy(cfg.src, [], 'all');
    const qs = shuffle(pool).slice(0, cfg.n); const answers = new Array(qs.length).fill(null); let i = 0; let finished = false;
    const end = Date.now() + cfg.min * 60000; const wrap = document.createElement('div'); wrap.className = 'qwrap';
    const finish = () => {
      finished = true; clearInterval(tm);
      let right = 0; qs.forEach((q, k) => { const ok = answers[k] === q.correct; record(q, answers[k] == null ? 'skipped' : ok ? 'right' : 'wrong', { mode: 'exam', pick: answers[k] }); if (ok) right++; });
      const score = Math.round(100 * right / qs.length); const exams = store.get('exams', []); exams.push({ at: Date.now(), n: qs.length, right, score, pass: cfg.pass }); store.set('exams', exams);
      wrap.innerHTML = `<div class="panel raised"><h2>${score >= cfg.pass ? 'עברת' : 'לא עברת'} · ${score}%</h2><div class="result"><div><b class="ok-text">${right}</b><span>נכון</span></div><div><b class="bad-text">${qs.length - right}</b><span>לא נכון</span></div><div><b>${cfg.pass}%</b><span>נדרש</span></div></div><div class="row"><a class="btn" href="#/exam">מבחן חדש</a><a class="btn ghost" href="#/mistakes">לחיזוק</a></div></div><h3>סקירת השאלות</h3>`;
      qs.forEach((q, k) => { const c = renderQuestion(q, { index: k, total: qs.length, showAnswer: true, picked: answers[k] }); wrap.appendChild(c); });
      window.scrollTo(0, 0);
    };
    const tm = setInterval(() => { const left = end - Date.now(); if (left <= 0) { finish(); return; } const t = $('.timer', wrap); if (t) t.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`; }, 500);
    const render = () => {
      if (finished) return;
      const answered = answers.filter(a => a != null).length;
      wrap.innerHTML = `<div class="qbar"><div class="between small muted"><span>נענו ${answered}/${qs.length}</span><span class="timer">--:--</span></div><div class="bar"><i style="width:${100 * (i + 1) / qs.length}%"></i></div></div>`;
      const q = qs[i];
      const card = renderQuestion(q, { index: i, total: qs.length, immediate: false, onAnswer: pick => { answers[i] = pick; } });
      if (answers[i] != null) $$('.opt', card)[answers[i]].classList.add('picked');
      wrap.appendChild(card);
      const c = document.createElement('div'); c.className = 'actions';
      c.innerHTML = `<button class="btn ghost" id="prev" ${i === 0 ? 'disabled' : ''}>${icon('chev-r')} הקודמת</button><button class="btn" id="next">${i === qs.length - 1 ? 'סיים והגש' : 'הבאה'} ${icon('chev-l')}</button>`;
      $('#prev', c).onclick = () => { i--; render(); }; $('#next', c).onclick = () => { if (i === qs.length - 1) { if (confirm('לסיים ולהגיש את המבחן?')) finish(); } else { i++; render(); window.scrollTo(0, 0); } };
      wrap.appendChild(c);
      const nav = document.createElement('div'); nav.className = 'numnav';
      nav.innerHTML = qs.map((_, k) => `<button data-k="${k}" class="${k === i ? 'cur' : answers[k] != null ? 'done' : ''}">${k + 1}</button>`).join('') + `<button style="width:auto;padding:0 10px" id="fin">סיים והגש</button>`;
      $$('[data-k]', nav).forEach(b => b.onclick = () => { i = +b.dataset.k; render(); window.scrollTo(0, 0); }); $('#fin', nav).onclick = () => { if (confirm('לסיים ולהגיש את המבחן?')) finish(); };
      wrap.appendChild(nav);
    };
    render(); return wrap;
  };

  views.lessons = () => {
    setTitle('שיעורים');
    return `<ul class="lesson-list panel" style="padding:4px 12px">${DB.lessons.map((l, i) => `<li><a href="#/lesson/${l.id}"><span class="num">${i + 1}</span><span><b>${esc(l.title)}</b><small>עמודים ${l.pages.join(', ')} · ${l.topics.map(esc).join(' · ')}</small></span>${icon('chev-l')}</a></li>`).join('')}</ul>`;
  };
  views.lesson = id => {
    const l = DB.lessons.find(x => x.id === id); if (!l) return `<div class="panel">שיעור לא נמצא</div>`;
    setTitle(l.title, 'שיעור');
    const idx = DB.lessons.indexOf(l); const prev = DB.lessons[idx - 1], next = DB.lessons[idx + 1];
    const qs = DB.questions.filter(q => l.topics.includes(q.topic));
    return `<div class="panel lesson-body"><h2>${esc(l.title)}</h2><div class="tablewrap">${l.html}</div></div>
      <div class="panel"><h3 style="margin-top:0">עמודי החוברת</h3>${l.pages.map(p => `<div class="imgwrap"><img class="pageimg" loading="lazy" src="${imgSrc(p)}" alt="עמוד ${p}"></div>`).join('')}</div>
      <div class="panel"><a class="btn block" href="#/practice/${encodeURIComponent(l.topics.join('|'))}">${icon('play')} תרגול על השיעור (${qs.length} שאלות)</a>
      <div class="between" style="margin-top:10px">${prev ? `<a class="btn ghost sm" href="#/lesson/${prev.id}">${icon('chev-r')} ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn ghost sm" href="#/lesson/${next.id}">${esc(next.title)} ${icon('chev-l')}</a>` : ''}</div></div>`;
  };

  views.browse = () => {
    setTitle('כל השאלות והתשובות');
    const wrap = document.createElement('div'); const s = stats();
    wrap.innerHTML = `<div class="panel"><div class="field"><label>חיפוש</label><input id="search" type="search" placeholder="מילה מהשאלה או מהתשובה…"></div>
      <div class="row"><span class="muted small">מקור:</span>${[['all', 'הכול'], ['course1', 'מבחן 1'], ['course2', 'מבחן 2'], ['pdf', 'חוברת']].map(([v, l], k) => `<label class="chip"><input type="radio" name="src" value="${v}" ${k === 0 ? 'checked' : ''} hidden>${l}</label>`).join('')}
      <select id="topicSel" style="width:auto"><option value="">כל הנושאים</option>${DB.topics.map(t => `<option>${esc(t)}</option>`).join('')}</select></div><div class="muted small" id="cnt" style="margin-top:8px"></div></div><div id="list"></div>`;
    const list = $('#list', wrap);
    const draw = () => {
      $$('label.chip', wrap).forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
      const term = $('#search', wrap).value.trim(); const src = wrap.querySelector('input[name=src]:checked').value; const topic = $('#topicSel', wrap).value;
      let qs = DB.questions.filter(q => (src === 'all' || q.source === src) && (!topic || q.topic === topic) && (!term || (q.q + ' ' + q.options.join(' ') + ' ' + (q.why || '')).includes(term)));
      $('#cnt', wrap).textContent = `${qs.length} שאלות`;
      list.innerHTML = qs.slice(0, 200).map(q => `<div class="qcard"><div class="qmeta"><span>${esc(srcLabel(q))}</span><span class="tags"><span class="tag">${esc(q.topic)}</span>${s[q.id] ? `<span class="tag ${isWeak(s[q.id]) ? 'bad' : 'ok'}">${s[q.id].right} נכון · ${s[q.id].wrong} לא · ${s[q.id].skipped || 0} דילוג</span>` : ''}</span></div><div class="qtext">${rich(q.q)}</div>${qimg(q)}${picLegend(q)}
        <div class="opts">${q.options.map((o, k) => `<div class="opt static ${k === q.correct ? 'correct' : ''}"><span class="letter">${HEB[k]}</span><span class="otext">${rich(o)}</span></div>`).join('')}</div>${q.why ? `<div class="why small">${esc(q.why)}</div>` : ''}</div>`).join('') + (qs.length > 200 ? '<div class="panel muted center">מוצגות 200 הראשונות – צמצם את החיפוש</div>' : '');
    };
    wrap.addEventListener('input', draw); wrap.addEventListener('change', draw); setTimeout(draw, 0);
    return wrap;
  };

  views.pages = () => {
    setTitle('דפי החוברת');
    const wrap = document.createElement('div');
    wrap.innerHTML = `<p class="muted small">15 עמודים סרוקים עם ההדגשות והפתקים שלך. לחיצה על עמוד מגדילה.</p>` + Array.from({ length: 15 }, (_, i) => `<div class="panel"><h3 style="margin-top:0">עמוד ${i + 1}${lessonForPage(i + 1)}</h3><div class="imgwrap"><img class="pageimg" loading="lazy" src="${imgSrc(i + 1)}" alt="עמוד ${i + 1}"></div></div>`).join('');
    return wrap;
  };
  const lessonForPage = p => { const ls = DB.lessons.filter(l => l.pages.includes(p)); return ls.length ? ` <span class="muted small">· ${ls.map(l => `<a href="#/lesson/${l.id}">${esc(l.title)}</a>`).join(' · ')}</span>` : ''; };

  // ---------- driving mode (hands-free) ----------
  views.drive = (state) => {
    setTitle('מצב נהיגה');
    const cfg = Object.assign({ mode: 'quiz', src: 'all', topics: [], n: 20, wait: 8, rate: 1, readOptionsInListen: true, autoNext: 3 }, store.get('drive', {}));
    if (!TTS.ok) return `<div class="panel"><h2>הדפדפן לא תומך בהקראה</h2><p>נסה ב-Chrome (אנדרואיד/מחשב) או Safari (iPhone).</p></div>`;
    if (state !== 'go') {
      const hv = TTS.hebrew();
      const html = `<div class="panel"><p class="muted small">האפליקציה מקריאה כל שאלה ואת התשובות, ואתה עונה <b>בקול</b> ("א", "ב", "ג", "ד" או "אחת/שתיים/שלוש/ארבע") או בלחיצה על כפתור גדול. פקודות קוליות: <b>חזור</b> · <b>הבא</b> · <b>עצור</b>.</p>
        ${!hv.length ? `<div class="tip">לא נמצא קול עברי במכשיר. באנדרואיד: הגדרות ← שפה ← המרת טקסט לדיבור ← Google TTS ← התקן עברית. ב-Windows: הגדרות ← זמן ושפה ← דיבור ← הוסף עברית. ההקראה תנסה בכל זאת.</div>` : ''}
        ${!SR ? `<div class="tip">זיהוי דיבור לא זמין בדפדפן זה – אפשר לענות בלחיצה על הכפתורים הגדולים, או לבחור "האזנה בלבד".</div>` : ''}
        <div class="field"><label>מצב</label><div class="row">
          <label class="check"><input type="radio" name="dmode" value="quiz" ${cfg.mode === 'quiz' ? 'checked' : ''}> ${icon('mic')} חידון – שאלה, אני עונה, משוב</label>
          <label class="check"><input type="radio" name="dmode" value="listen" ${cfg.mode === 'listen' ? 'checked' : ''}> ${icon('headphones')} האזנה בלבד – שאלה, תשובה נכונה, הסבר</label></div></div>
        <div class="fields"><div class="field"><label>מקור</label><select id="dsrc"><option value="all" ${cfg.src === 'all' ? 'selected' : ''}>הכול</option><option value="course" ${cfg.src === 'course' ? 'selected' : ''}>מבחני הקורס</option><option value="pdf" ${cfg.src === 'pdf' ? 'selected' : ''}>שאלות החוברת</option><option value="weak" ${cfg.src === 'weak' ? 'selected' : ''}>לחיזוק בלבד</option></select></div>
        <div class="field"><label>שאלות</label><input type="number" id="dn" min="5" max="200" value="${cfg.n}"></div>
        <div class="field"><label>זמן למענה (שניות)</label><input type="number" id="dwait" min="3" max="30" value="${cfg.wait}"></div>
        <div class="field"><label>השהיה לפני הבאה (שניות)</label><input type="number" id="dnext" min="0" max="15" value="${cfg.autoNext}"></div></div>
        <div class="field"><label>נושאים <span class="muted">(ריק = הכול)</span></label><div class="row">${DB.topics.map(t => `<label class="chip ${cfg.topics.includes(t) ? 'on' : ''}"><input type="checkbox" class="dtopic" value="${esc(t)}" ${cfg.topics.includes(t) ? 'checked' : ''} hidden>${esc(t)}</label>`).join('')}</div></div>
        <div class="fields"><div class="field"><label>מהירות דיבור <span id="drateV" class="muted">${store.get('rate', 1)}</span></label><input type="range" id="drate" min="0.6" max="1.5" step="0.1" value="${store.get('rate', 1)}"></div>
        <div class="field"><label>קול</label><select id="dvoice"><option value="">אוטומטי</option>${TTS.voices.map(v => `<option value="${esc(v.voiceURI)}" ${store.get('voiceURI') === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></div></div>
        <label class="check"><input type="checkbox" id="dro" ${cfg.readOptionsInListen ? 'checked' : ''}> במצב האזנה – להקריא גם את כל האפשרויות</label>
        <div class="row" style="margin-top:14px"><button class="btn lg" id="dstart">${icon('play')} התחל</button><button class="btn ghost" id="dtest">${icon('volume')} בדיקת קול</button></div>
        <p class="muted small">המסך יישאר דלוק בזמן ההקראה. שים את הטלפון במעמד ואל תיגע בו בנסיעה.</p></div>`;
      setTimeout(() => {
        const save = () => { store.set('drive', { mode: document.querySelector('input[name=dmode]:checked').value, src: $('#dsrc').value, n: +$('#dn').value || 20, wait: +$('#dwait').value || 8, autoNext: +$('#dnext').value, topics: $$('.dtopic:checked').map(x => x.value), readOptionsInListen: $('#dro').checked }); store.set('rate', +$('#drate').value); store.set('voiceURI', $('#dvoice').value || null); TTS.load(); };
        $('#drate').oninput = e => { $('#drateV').textContent = e.target.value; };
        $$('.dtopic').forEach(c => c.onchange = () => c.closest('label').classList.toggle('on', c.checked));
        $('#dtest').onclick = () => { save(); TTS.warm(); TTS.cancel(); TTS.speak('שלום! זהו קול הבדיקה. כלי שיט ממוכן מפנה דרך למפרשית.'); };
        $('#dstart').onclick = () => { save(); TTS.warm(); location.hash = '#/drive/go'; };
      }, 0);
      return html;
    }
    // ----- running -----
    let pool = DB.questions.slice(); const s = stats();
    if (cfg.src === 'course') pool = pool.filter(q => q.source !== 'pdf'); if (cfg.src === 'pdf') pool = pool.filter(q => q.source === 'pdf'); if (cfg.src === 'weak') pool = pool.filter(q => isWeak(s[q.id]));
    if (cfg.topics.length) pool = pool.filter(q => cfg.topics.includes(q.topic));
    if (!pool.length) pool = DB.questions.slice();
    const qs = shuffle(pool).slice(0, cfg.n);
    const wrap = document.createElement('div'); wrap.className = 'drive qwrap';
    let i = 0, right = 0, alive = true, paused = false, pendingPick = null, srBroken = false; const wrongList = [];
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const status = t => { const el = $('#dstatus', wrap); if (el) el.textContent = t; };
    const waitIfPaused = async () => { while (paused && alive) await sleep(200); };
    keepAwake(true);
    const stop = () => { alive = false; TTS.cancel(); keepAwake(false); };
    const finishScreen = () => {
      wrap.innerHTML = `<div class="panel raised"><h2>סיימת</h2><div class="result"><div><b class="ok-text">${right}</b><span>נכון</span></div><div><b class="bad-text">${wrongList.length}</b><span>לא נכון / דילוג</span></div><div><b>${qs.length}</b><span>שאלות</span></div></div><div class="row"><a class="btn" href="#/drive">חזרה להגדרות</a><a class="btn ghost" href="#/mistakes">לחיזוק</a></div></div>`;
      wrongList.forEach(q => wrap.appendChild(renderQuestion(q, { showAnswer: true })));
    };
    const draw = (q, phase) => {
      wrap.innerHTML = `<div class="qbar"><div class="between small muted"><span>שאלה ${i + 1} / ${qs.length}</span><span id="dstatus" class="dstatus">${phase}</span></div><div class="bar"><i style="width:${100 * i / qs.length}%"></i></div></div>
        <div class="qcard"><div class="qtext big">${rich(q.q)}</div>${qimg(q)}
        <div class="driveopts">${q.options.map((o, k) => `<button class="opt driveopt" data-i="${k}"><span class="letter">${HEB[k]}</span><span class="otext">${rich(o)}</span></button>`).join('')}</div>
        <div id="dfeedback"></div></div>
        <div class="drivectl">
          <button class="btn ghost" id="drepeat">${icon('refresh')} חזור</button>
          <button class="btn ghost" id="dpause">${paused ? icon('play') + ' המשך' : icon('pause') + ' השהה'}</button>
          <button class="btn ghost" id="dskip">${icon('skip')} הבא</button>
          <button class="btn danger" id="dstop">${icon('stop')} סיום</button>
        </div>`;
      $$('.driveopt', wrap).forEach(b => b.onclick = () => { if (cfg.mode === 'quiz') { pendingPick = +b.dataset.i; TTS.cancel(); } });
      $('#drepeat', wrap).onclick = () => { pendingPick = 'repeat'; TTS.cancel(); };
      $('#dskip', wrap).onclick = () => { pendingPick = 'skip'; TTS.cancel(); };
      $('#dpause', wrap).onclick = () => { paused = !paused; $('#dpause', wrap).innerHTML = paused ? icon('play') + ' המשך' : icon('pause') + ' השהה'; if (paused) TTS.cancel(); status(paused ? 'מושהה' : ''); };
      $('#dstop', wrap).onclick = () => { stop(); finishScreen(); };
    };
    const showResult = (q, pick) => {
      const ok = pick === q.correct;
      $$('.driveopt', wrap).forEach(b => { const k = +b.dataset.i; b.disabled = true; if (k === q.correct) b.classList.add('correct'); if (pick === k && !ok) b.classList.add('wrong'); });
      $('#dfeedback', wrap).innerHTML = `<div class="why ${pick == null ? 'neutral' : ok ? '' : 'bad'}"><b>${pick == null ? 'התשובה' : ok ? 'נכון' : 'לא נכון'}</b> · <b>${HEB[q.correct]}.</b> ${esc(q.options[q.correct])}${q.why ? `<div class="small" style="margin-top:6px">${esc(q.why)}</div>` : ''}</div>`;
    };
    const takeInput = () => { const p = pendingPick; pendingPick = null; if (p == null) return null; return typeof p === 'number' ? { pick: p } : { cmd: p }; };
    const speakChecked = async (t) => { await waitIfPaused(); if (!alive) return; await TTS.speak(t); };
    (async () => {
      await sleep(300);
      while (alive && i < qs.length) {
        const q = qs[i]; let redo = false; pendingPick = null;
        draw(q, 'מקריא…');
        await speakChecked(`שאלה ${i + 1}.`); await speakChecked(spoken(q.q));
        if (cfg.mode === 'quiz' || cfg.readOptionsInListen) for (let k = 0; k < q.options.length && alive; k++) { if (pendingPick != null) break; await speakChecked(`${HEB[k]}. ${spoken(q.options[k])}`); }
        if (!alive) break;
        let result = null;
        if (cfg.mode === 'quiz') {
          const deadline = Date.now() + cfg.wait * 1000 * 3; let tries = 0;
          while (alive && !result) {
            const manual = takeInput(); if (manual) { result = manual; break; }
            await waitIfPaused();
            status(SR ? 'מקשיב… אמור א, ב, ג או ד' : 'לחץ על התשובה');
            const t0 = Date.now();
            let heard = (SR && !srBroken) ? await listen(cfg.wait * 1000) : null;
            if (SR && !srBroken && heard == null && Date.now() - t0 < 1500) { srBroken = true; status('המיקרופון לא זמין – לחץ על התשובה'); }
            if (heard == null) { const end = t0 + cfg.wait * 1000; while (Date.now() < end && alive && pendingPick == null) { await waitIfPaused(); await sleep(150); } }
            const manual2 = takeInput(); if (manual2) { result = manual2; break; }
            const p = parseSpeech(heard);
            if (p && (p.pick != null || p.cmd)) { result = p; break; }
            tries++; status(p && p.unknown ? `שמעתי "${p.unknown}" – לא הבנתי` : (srBroken ? 'לחץ על התשובה' : 'לא שמעתי'));
            if (Date.now() > deadline || tries >= 3) { result = { pick: null }; break; }
            await speakChecked(srBroken ? 'לחץ על התשובה.' : tries === 1 ? 'לא הבנתי. אמור א, ב, ג או ד.' : 'שוב, בבקשה: א, ב, ג או ד.');
          }
          if (!alive) break;
          if (result.cmd === 'repeat') { redo = true; }
          else if (result.cmd === 'stop') { stop(); finishScreen(); return; }
          else if (result.cmd === 'pause') { paused = true; $('#dpause', wrap).innerHTML = icon('play') + ' המשך'; status('מושהה – לחץ המשך'); await waitIfPaused(); redo = true; }
          else if (result.cmd === 'skip') { record(q, 'skipped', { mode: 'drive' }); wrongList.push(q); showResult(q, null); await speakChecked(`התשובה: ${HEB[q.correct]}. ${spoken(q.options[q.correct])}`); }
          else {
            const pick = result.pick; const ok = pick === q.correct;
            record(q, pick == null ? 'skipped' : ok ? 'right' : 'wrong', { mode: 'drive', pick }); if (ok) right++; else wrongList.push(q);
            showResult(q, pick); status('');
            if (pick == null) await speakChecked(`לא נענתה. התשובה הנכונה: ${HEB[q.correct]}. ${spoken(q.options[q.correct])}.`);
            else if (ok) await speakChecked(`נכון! ${HEB[q.correct]}. ${spoken(q.options[q.correct])}.`);
            else await speakChecked(`לא נכון. בחרת ${HEB[pick]}. התשובה הנכונה: ${HEB[q.correct]}. ${spoken(q.options[q.correct])}.`);
            if (q.why) await speakChecked(q.why);
          }
        } else {
          await sleep(600); showResult(q, null);
          await speakChecked(`התשובה הנכונה: ${HEB[q.correct]}. ${spoken(q.options[q.correct])}.`);
          if (q.why) await speakChecked(q.why);
          const c = takeInput(); if (c && c.cmd === 'repeat') redo = true; if (c && c.cmd === 'stop') { stop(); finishScreen(); return; }
        }
        if (!alive) break;
        if (!redo) {
          status('השאלה הבאה בעוד רגע…');
          const end = Date.now() + cfg.autoNext * 1000;
          while (Date.now() < end && alive) { const c = takeInput(); if (c && c.cmd === 'repeat') { redo = true; break; } if (c && c.cmd === 'stop') { stop(); finishScreen(); return; } if (c && c.cmd === 'skip') break; await sleep(150); }
          if (!redo) i++;
        }
      }
      if (alive) { stop(); await TTS.speak(`סיימת. ${right} תשובות נכונות מתוך ${qs.length}.`); finishScreen(); }
    })();
    const onHash = () => { if (!location.hash.startsWith('#/drive/go')) { stop(); window.removeEventListener('hashchange', onHash); } };
    window.addEventListener('hashchange', onHash);
    return wrap;
  };

  views.pics = () => {
    setTitle('דגלים וסימנים');
    if (!PICS) return '<div class="panel">הגלריה לא נטענה</div>';
    const numOf = key => Object.keys(PICS.NUMBERS).filter(n => PICS.NUMBERS[n] === key).map(n => `תמונה ${n}`).join(', ');
    const sec = (title, obj, prefix, sub) => `<div class="panel"><h2>${title}</h2>${sub ? `<p class="muted small">${sub}</p>` : ''}<div class="gallery">${Object.keys(obj).map(k => `<figure class="pic"><div class="picsvg">${obj[k].svg}</div><figcaption>${prefix === 'flag' ? `<b>${k}</b> · ${esc(obj[k].name)}<br>` : ''}${esc(obj[k].he)}${obj[k].detail ? `<br><span class="muted">${esc(obj[k].detail)}</span>` : ''}${numOf(prefix + ':' + k) ? `<br><span class="tag">${numOf(prefix + ':' + k)}</span>` : ''}</figcaption></figure>`).join('')}</div></div>`;
    return `<p class="muted small">מצוירים לפי התקן הבין-לאומי ואומתו מול תמונות המבחן. מספרי "תמונה" הם המספרים שמופיעים בשאלות.</p>` +
      sec('דגלי קוד (ICS)', PICS.FLAGS, 'flag', 'הבולטים למבחן: A צוללנים · B חומרים מסוכנים · O אדם בים · N מעל C מצוקה · U סכנה · P עומד להפליג') +
      sec('סימני יום', PICS.SHAPES, 'shape') + sec('אורות ואותות מעגנה', PICS.MISC, 'misc') + sec('אותות קוליים', PICS.SOUNDS, 'sound', 'עיגול = צפירה קצרה (כשנייה) · פס = צפירה ארוכה (4–6 שניות)');
  };

  views.howto = () => {
    setTitle('איך נרשמים למבחן');
    const h = DB.howto || {};
    return `<div class="panel"><h2>${esc(h.title || 'איך מתחילים')}</h2>${(h.steps || []).map(s => `<h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>`).join('')}<p class="muted small">מקור: <a href="${esc(h.source || '#')}" target="_blank" rel="noopener">אתר הקורס</a></p></div>
      <div class="panel"><h3 style="margin-top:0">איפוס התקדמות במכשיר זה</h3><p class="muted small">מוחק סטטיסטיקות, מבחנים והגדרות השמורים בדפדפן (הגיליון לא נמחק).</p><button class="btn ghost" id="resetAll">${icon('trash')} איפוס</button></div>`;
  };

  // ---------- Google Sheet sync ----------
  const SCRIPT_URL_HELP = 'https://script.google.com/macros/s/…/exec';
  views.sync = () => {
    setTitle('סנכרון לגיליון Google');
    if (!SYNC) return '<div class="panel">מודול הסנכרון לא נטען</div>';
    const c = SYNC.cfg(); const st = SYNC.status(); const m = SYNC.meta();
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="panel">
      <p class="muted small">כל תשובה או דילוג נרשמים בגיליון Google שלך (לשונית <b>Log</b>), ולשונית <b>Stats</b> מראה אילו שאלות עוד לא יושבות. האפליקציה גם קוראת מהגיליון, כך שההתקדמות משותפת לטלפון ולמחשב.</p>
      <div class="field"><label>כתובת ה-Web App של הסקריפט</label><input type="url" id="surl" placeholder="${SCRIPT_URL_HELP}" value="${esc(c.url)}" dir="ltr"><span class="help">מסתיימת ב-/exec. איך משיגים אותה – בהוראות למטה.</span><span id="surlMsg"></span></div>
      <div class="field"><label>שם המכשיר (מופיע בגיליון)</label><input type="text" id="sdev" value="${esc(c.device || SYNC.deviceName())}"></div>
      <div class="row"><button class="btn" id="ssave">שמור</button><button class="btn ghost" id="sping">${icon('cloud')} בדוק חיבור</button><button class="btn ghost" id="sflush">שלח עכשיו (${st.pending})</button><button class="btn ghost" id="spull">משוך מהגיליון</button></div>
      <div class="status-line" style="margin-top:10px" id="sstatus">${syncStatusText(st, m)}</div>
    </div>
    <div class="panel"><details ${c.url ? '' : 'open'}><summary>הוראות התקנה (פעם אחת, כ-3 דקות)</summary>
      <ol style="padding-inline-start:1.2rem;line-height:1.8">
        <li>פתח <a href="https://sheets.new" target="_blank" rel="noopener">גיליון Google חדש</a> ותן לו שם (למשל "משיט 12").</li>
        <li>בתפריט: <b>Extensions ← Apps Script</b>. מחק את הקוד שמופיע והדבק במקומו את הקוד למטה. שמור (Ctrl+S).</li>
        <li>למעלה מימין: <b>Deploy ← New deployment</b>. לחץ על גלגל השיניים ← <b>Web app</b>. Execute as: <b>Me</b>. Who has access: <b>Anyone</b>. לחץ Deploy ואשר הרשאות (Advanced ← Go to … ← Allow).</li>
        <li>העתק את <b>Web app URL</b> (מסתיים ב-/exec), הדבק בשדה למעלה, לחץ "שמור" ואז "בדוק חיבור".</li>
      </ol>
      <div class="between"><b>הקוד להדבקה</b><button class="btn sm ghost" id="scopy">${icon('copy')} העתק</button></div>
      <pre id="scode">טוען…</pre>
      <p class="muted small">עמודות ה-Log: timestamp, device, mode, question_id, source, question_no, topic, question, answered, correct_answer, result (right/wrong/skipped), seconds. אם תשנה את הקוד – Deploy ← Manage deployments ← Edit ← New version.</p>
    </details></div>`;
    const setMsg = (t, ok) => { const el = $('#surlMsg', wrap); el.className = ok ? 'okmsg' : 'err'; el.textContent = t; };
    const refresh = () => { const st = SYNC.status(), m = SYNC.meta(); $('#sstatus', wrap).innerHTML = syncStatusText(st, m); $('#sflush', wrap).innerHTML = `שלח עכשיו (${st.pending})`; };
    $('#ssave', wrap).onclick = () => { SYNC.setCfg({ url: $('#surl', wrap).value.trim(), device: $('#sdev', wrap).value.trim() }); if (!SYNC.enabled() && $('#surl', wrap).value.trim()) setMsg('הכתובת צריכה להתחיל ב-https://script.google.com/', false); else setMsg(SYNC.enabled() ? 'נשמר' : 'נשמר (סנכרון כבוי)', true); refresh(); updateSyncDot(); };
    $('#sping', wrap).onclick = async () => { SYNC.setCfg({ url: $('#surl', wrap).value.trim(), device: $('#sdev', wrap).value.trim() }); setMsg('בודק…', true); try { const j = await SYNC.ping(); setMsg(`מחובר לגיליון "${j.sheet || ''}" · ${j.rows || 0} שורות ב-Log`, true); } catch (e) { setMsg('אין חיבור: ' + e.message, false); } refresh(); updateSyncDot(); };
    $('#sflush', wrap).onclick = async () => { const r = await SYNC.flush(); toast(r.state === 'synced' ? 'הכול נשלח' : r.error ? 'שגיאה: ' + r.error : 'ממתין…'); refresh(); updateSyncDot(); };
    $('#spull', wrap).onclick = async () => { try { const st = await SYNC.pull(mergeRemote); toast(st ? `נמשכו נתונים על ${Object.keys(st).length} שאלות` : 'הסנכרון כבוי'); } catch (e) { toast('שגיאה: ' + e.message); } refresh(); updateSyncDot(); };
    $('#scopy', wrap).onclick = async () => { try { await navigator.clipboard.writeText($('#scode', wrap).textContent); toast('הקוד הועתק'); } catch (e) { toast('לא הצלחתי להעתיק – סמן והעתק ידנית'); } };
    (window.__APPS_SCRIPT__ ? Promise.resolve(window.__APPS_SCRIPT__) : fetch('apps_script.gs').then(r => r.text())).then(t => { $('#scode', wrap).textContent = t; }).catch(() => { $('#scode', wrap).textContent = 'הקוד נמצא בקובץ tools/apps_script.gs במאגר.'; });
    return wrap;
  };
  const syncStatusText = (st, m) => ({ off: 'הסנכרון כבוי – הזן כתובת ולחץ שמור.', synced: `מסונכרן · נשלח לאחרונה ${fmtTime(m.lastPush)} · נמשך ${fmtTime(m.lastPull)}`, pending: `${st.pending} רשומות ממתינות לשליחה…`, offline: `לא מקוון – ${st.pending} רשומות יישלחו כשיהיה חיבור.`, error: `שגיאה בשליחה: ${st.error} (${st.pending} ממתינות)` }[st.state] || '');
  function updateSyncDot() { if (!SYNC) return; const st = SYNC.status(); const b = $('#syncBtn'); b.dataset.state = st.state; $('use', b).setAttribute('href', st.state === 'synced' ? '#i-cloud-check' : st.state === 'off' ? '#i-cloud-off' : '#i-cloud'); b.title = syncStatusText(st, SYNC.meta()); }

  // ---------- router ----------
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const v = parts[0] || 'home'; const rest = parts.slice(1);
    $$('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === v || (v === 'lesson' && a.dataset.view === 'lessons') || (v === 'resume' && a.dataset.view === 'practice')));
    let out;
    if (v === 'mistakes' && rest[1] === 'go') out = views.mistakes.go(rest[0]);
    else { const fn = views[v] || views.home; out = fn(...rest); }
    app.innerHTML = ''; if (typeof out === 'string') app.innerHTML = out; else app.appendChild(out);
    fillPics(app);
    const rb = $('#resetAll'); if (rb) rb.onclick = () => { if (confirm('לאפס את כל ההתקדמות במכשיר הזה?')) { localStorage.clear(); location.reload(); } };
    window.scrollTo(0, 0);
  }
  app.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('pageimg')) e.target.classList.toggle('zoom'); });
  window.addEventListener('hashchange', route);

  // ---------- boot ----------
  function boot(data) {
    DB = data; route(); refreshWeakPill();
    if (SYNC) {
      SYNC.onChange(updateSyncDot); updateSyncDot();
      if (SYNC.enabled() && navigator.onLine) { SYNC.flush(); if (Date.now() - SYNC.meta().lastPull > 10 * 60 * 1000) SYNC.pull(mergeRemote).then(st => { if (st) route(); }).catch(() => { }); }
    }
  }
  if (window.__BUNDLE__) boot(window.__BUNDLE__);
  else fetch('data/bundle.json').then(r => r.json()).then(boot).catch(e => { app.innerHTML = `<div class="panel empty">${icon('cloud-off')}<h2>שגיאה בטעינת הנתונים</h2><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">נסה שוב</button></div>`; });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
