/* משיט 12 – study app. Vanilla JS, RTL, offline-first. */
(function () {
  'use strict';
  const HEB = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app'), nav = $('#nav'), statusEl = $('#status');
  let DB = null;               // bundle
  const IMG = window.__IMAGES__ || null;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ml12:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ml12:' + k, JSON.stringify(v)); } catch (e) { } }
  };
  // ---------- theme ----------
  const applyTheme = t => { document.documentElement.setAttribute('data-theme', t); store.set('theme', t); };
  applyTheme(store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('#themeBtn').onclick = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  $('#menuBtn').onclick = () => nav.classList.toggle('open');
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') nav.classList.remove('open'); });

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const qimg = q => q.img ? `<div class="qimgwrap"><img class="qimg" loading="lazy" src="${IMG ? (IMG[q.img.split('/').pop()] || q.img) : q.img}" alt="תרשים"></div>` : '';
  const imgSrc = n => IMG ? IMG[`p${String(n).padStart(2, '0')}.jpg`] : `pdf/p${String(n).padStart(2, '0')}.jpg`;
  const srcLabel = q => q.source === 'pdf' ? `חוברת עמ' ${q.page || ''}` : `מבחן ${q.course} · שאלה ${q.n}`;
  const stats = () => store.get('stats', {});
  const saveStats = s => store.set('stats', s);
  function record(qid, ok) {
    const s = stats(); const r = s[qid] || { seen: 0, right: 0, wrong: 0, streak: 0, box: 0 };
    r.seen++; if (ok) { r.right++; r.streak++; r.box = Math.min(5, r.box + 1); } else { r.wrong++; r.streak = 0; r.box = 0; }
    r.last = Date.now(); s[qid] = r; saveStats(s);
  }
  const isWeak = r => r && (r.wrong > 0 && r.streak < 2);
  const setTitle = t => { $('#title').textContent = t; document.title = t + ' – משיט 12'; };
  const topicColor = t => { let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 60% 45%)`; };

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
        // Chrome sometimes never fires onend; poll as a safety net
        const t = setInterval(() => { if (!speechSynthesis.speaking && !speechSynthesis.pending) fin(); }, 400);
        setTimeout(fin, 60000);
      });
    },
    cancel() { if (this.ok) speechSynthesis.cancel(); }
  };
  const clean4tts = s => String(s).replace(/ק["״]ג/g, 'קילוגרם').replace(/ס["״]מ/g, 'סנטימטר').replace(/מ["״]מ/g, 'מילימטר').replace(/ק["״]מ/g, 'קילומטר').replace(/(\d)\s*מ['׳](?![א-ת])/g, '$1 מטר').replace(/ת["״]ז/g, 'תעודת זהות').replace(/ע["״]י/g, 'על ידי').replace(/ראשל["״]צ/g, 'ראשון לציון').replace(/ת["״]א/g, 'תל אביב').replace(/כ["״]ש/g, 'כלי שיט').replace(/רספ["״]ן/g, 'רספן').replace(/אחה["״]צ/g, 'אחר הצהריים').replace(/מס['׳]/g, 'מספר').replace(/אחה["״]צ/g, 'אחר הצהריים').replace(/["'״׳]/g, '').replace(/\(([^)]*)\)/g, ', $1,').replace(/\s*[-–]\s*/g, ', ').replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').replace(/\s+\./g, '.').trim();
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
  // escape text and turn "תמונה NN" into the actual symbol (inline); add a keyword icon when a symbol is described in words
  const rich = (text, { keywords = true } = {}) => {
    let h = esc(text); let hadPic = false;
    if (PICS) {
      h = h.replace(PIC_RE, (m, first, rest) => { const nums = [+first, ...((rest || '').match(/\d+/g) || []).map(Number)]; const known = nums.filter(n => PICS.byNumber(n)); if (!known.length) return m; hadPic = true; return nums.map(n => PICS.byNumber(n) ? picTag(PICS.byNumber(n).key, n) : `תמונה ${n}`).join(' '); });
      if (keywords && !hadPic) { for (const [re, key] of KEYPICS) { if (key && re.test(text)) { h = picTag(key, null) + ' ' + h; break; } } }
    }
    return h;
  };
  // spoken form for TTS: "תמונה 92" -> "תמונה 92, דגל משבצות כחול לבן"
  const spoken = text => !PICS ? text : String(text).replace(PIC_RE, m => m.replace(/\d+/g, d => { const p = PICS.byNumber(+d); return p && p.info.desc ? `${d}, ${p.info.desc},` : d; }));
  const fillPics = root => { if (!PICS) return; root.querySelectorAll('[data-pic]').forEach(el => { el.innerHTML = PICS.svg(el.dataset.pic); el.classList.add('picsvg'); }); root.querySelectorAll('[data-picn]').forEach(el => { const p = PICS.byNumber(+el.dataset.picn); if (p) { el.innerHTML = p.svg; el.classList.add('picsvg'); } }); };
  const picLegend = q => { if (!PICS) return ''; const ns = [...new Set(picsIn(q.q + ' ' + q.options.join(' ')))].filter(n => PICS.byNumber(n)); if (!ns.length) return ''; return `<div class="piclegend">${ns.map(n => `<span><b>${n}</b> ${esc(PICS.byNumber(n).info.he)}</span>`).join('')}</div>`; };

  // ---------- question card ----------
  function renderQuestion(q, opts = {}) {
    const { index, total, onAnswer, showAnswer } = opts;
    const div = document.createElement('div'); div.className = 'card question';
    div.innerHTML = `<div class="qhead"><span>${index != null ? `שאלה ${index + 1}${total ? ' / ' + total : ''}` : ''}</span><span>${TTS.ok ? '<button class="iconbtn speakbtn" title="הקרא">🔊</button>' : ''}<span class="tag">${esc(q.topic)}</span><span class="tag">${esc(srcLabel(q))}</span></span></div>
      <div class="qtext">${rich(q.q)}</div>${qimg(q)}${showAnswer ? picLegend(q) : ''}
      <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="letter">${HEB[i]}.</span> ${rich(o)}</button>`).join('')}</div>
      <div class="feedback"></div>`;
    const buttons = [...div.querySelectorAll('.opt')];
    const reveal = picked => {
      buttons.forEach(b => { b.disabled = true; const i = +b.dataset.i; if (i === q.correct) b.classList.add('correct'); if (picked === i && i !== q.correct) b.classList.add('wrong'); if (picked === i) b.classList.add('picked'); });
      const ok = picked === q.correct;
      if (!$('.piclegend', div)) $('.qtext', div).insertAdjacentHTML('afterend', picLegend(q));
      $('.feedback', div).innerHTML = `<div class="why ${ok ? '' : 'bad'}"><b>${ok ? '✔ נכון!' : '✘ לא נכון.'}</b> התשובה הנכונה: <b>${HEB[q.correct]}. ${esc(q.options[q.correct])}</b>${q.why ? `<br><span class="small">${esc(q.why)}</span>` : ''}</div>`;
    };
    if (showAnswer) reveal(null);
    const sb = $('.speakbtn', div); if (sb) sb.onclick = () => { TTS.warm(); speakQuestion(q); };
    buttons.forEach(b => b.onclick = () => { const i = +b.dataset.i; if (opts.immediate !== false) reveal(i); else { buttons.forEach(x => x.classList.remove('picked')); b.classList.add('picked'); } onAnswer && onAnswer(i, i === q.correct); });
    return div;
  }

  // ---------- quiz session (practice / mistakes) ----------
  function runSession(questions, { title, backHash }) {
    setTitle(title);
    let i = 0, right = 0; const wrongList = [];
    const wrap = document.createElement('div');
    const render = () => {
      wrap.innerHTML = '';
      if (i >= questions.length) {
        wrap.innerHTML = `<div class="card center"><h2>סיימת! 🎉</h2><div class="stat"><div><b>${right}</b>נכונות</div><div><b>${questions.length - right}</b>שגויות</div><div><b>${Math.round(100 * right / questions.length)}%</b>ציון</div></div>
          ${wrongList.length ? `<h3>לחזרה:</h3>` : ''}</div>`;
        wrongList.forEach(q => wrap.appendChild(renderQuestion(q, { showAnswer: true })));
        const c = document.createElement('div'); c.className = 'card center';
        c.innerHTML = `<a class="btn" href="${backHash}">חזרה</a> <a class="btn secondary" href="#/mistakes">🔁 חזרה על טעויות</a>`;
        wrap.appendChild(c); return;
      }
      const top = document.createElement('div'); top.className = 'progress'; top.innerHTML = `<i style="width:${100 * i / questions.length}%"></i>`; wrap.appendChild(top);
      const q = questions[i];
      const card = renderQuestion(q, { index: i, total: questions.length, onAnswer: (pick, ok) => { record(q.id, ok); if (ok) right++; else wrongList.push(q); next.style.display = ''; } });
      wrap.appendChild(card);
      const next = document.createElement('div'); next.className = 'card center'; next.style.display = 'none';
      next.innerHTML = `<button class="btn">השאלה הבאה ←</button>`; $('button', next).onclick = () => { i++; render(); window.scrollTo(0, 0); };
      wrap.appendChild(next);
      const quit = document.createElement('div'); quit.className = 'center small'; quit.innerHTML = `<a href="${backHash}" class="muted">יציאה</a>`; wrap.appendChild(quit);
    };
    render(); return wrap;
  }

  // ---------- views ----------
  const views = {};
  views.home = () => {
    setTitle('משיט 12 ⚓');
    const s = stats(); const seen = Object.keys(s).length; const weak = DB.questions.filter(q => isWeak(s[q.id])).length;
    const mastered = DB.questions.filter(q => s[q.id] && s[q.id].box >= 3).length;
    const exams = store.get('exams', []); const last = exams[exams.length - 1];
    return `<div class="card"><h2>הדרך שלך לרישיון סירה א׳ (משיט 12)</h2>
      <p class="muted small">מאגר: ${DB.counts.course1} שאלות ממבחן 1${DB.counts.course2 ? `, ${DB.counts.course2} ממבחן 2` : ''} + ${DB.counts.pdf} שאלות מהחוברת = <b>${DB.counts.total}</b> שאלות, ${DB.lessons.length} שיעורים.</p>
      <div class="stat"><div><b>${seen}</b>שאלות נראו</div><div><b>${mastered}</b>נשלטות</div><div><b>${weak}</b>לחיזוק</div><div><b>${last ? last.score + '%' : '–'}</b>מבחן אחרון</div></div>
      <div class="progress"><i style="width:${100 * mastered / DB.counts.total}%"></i></div></div>
      <div class="grid">
        <a class="tile" href="#/lessons"><span class="big">📖</span><b>שיעורים</b><small>החומר מהחוברת מסודר לפי נושאים</small></a>
        <a class="tile" href="#/practice"><span class="big">🎯</span><b>תרגול לפי נושא</b><small>משוב מיידי + הסבר לכל שאלה</small></a>
        <a class="tile" href="#/drive" style="border-right:6px solid var(--accent)"><span class="big">🚗🎧</span><b>מצב נהיגה</b><small>הקראה קולית + מענה בקול, בלי ידיים</small></a>
        <a class="tile" href="#/exam"><span class="big">📝</span><b>סימולציית מבחן</b><small>שאלות אקראיות עם טיימר וציון</small></a>
        <a class="tile" href="#/mistakes"><span class="big">🔁</span><b>חזרה על טעויות</b><small>${weak ? weak + ' שאלות מחכות' : 'אין טעויות פתוחות'}</small></a>
        <a class="tile" href="#/pics"><span class="big">🚩</span><b>דגלים וסימנים</b><small>דגלי קוד, סימני יום, אורות, אותות קוליים – בתמונות</small></a>
        <a class="tile" href="#/browse"><span class="big">📚</span><b>כל השאלות והתשובות</b><small>עיון וחיפוש במאגר המלא</small></a>
        <a class="tile" href="#/pages"><span class="big">🖼️</span><b>דפי החוברת</b><small>15 עמודים סרוקים עם ההדגשות שלך</small></a>
        <a class="tile" href="#/howto"><span class="big">🧭</span><b>איך נרשמים למבחן</b><small>טופס רפואי, אגרה, זימון</small></a>
      </div>`;
  };

  views.lessons = () => {
    setTitle('שיעורים');
    return `<div class="grid">${DB.lessons.map((l, i) => `<a class="tile" href="#/lesson/${l.id}"><small>שיעור ${i + 1}</small><b>${esc(l.title)}</b><small>עמודים ${l.pages.join(', ')} · ${l.topics.map(esc).join(' · ')}</small></a>`).join('')}</div>`;
  };
  views.lesson = id => {
    const l = DB.lessons.find(x => x.id === id); if (!l) return `<div class="card">שיעור לא נמצא</div>`;
    setTitle(l.title);
    const idx = DB.lessons.indexOf(l); const prev = DB.lessons[idx - 1], next = DB.lessons[idx + 1];
    const qs = DB.questions.filter(q => l.topics.includes(q.topic));
    return `<div class="card"><h2>${esc(l.title)}</h2><div class="tablewrap">${l.html}</div></div>
      <div class="card"><h3>עמודי החוברת</h3>${l.pages.map(p => `<div class="imgwrap"><img class="pageimg" loading="lazy" src="${imgSrc(p)}" alt="עמוד ${p}"></div>`).join('')}</div>
      <div class="card center"><a class="btn" href="#/practice/${encodeURIComponent(l.topics.join('|'))}">🎯 תרגול על השיעור (${qs.length} שאלות)</a>
      <div class="row" style="justify-content:center;margin-top:8px">${prev ? `<a class="btn secondary small" href="#/lesson/${prev.id}">→ ${esc(prev.title)}</a>` : ''}${next ? `<a class="btn secondary small" href="#/lesson/${next.id}">${esc(next.title)} ←</a>` : ''}</div></div>`;
  };

  views.practice = (topicsParam) => {
    setTitle('תרגול לפי נושא');
    const s = stats();
    if (topicsParam) {
      const topics = decodeURIComponent(topicsParam).split('|');
      const only = store.get('practiceOnlyNew', false);
      let qs = DB.questions.filter(q => topics.includes(q.topic));
      if (only) qs = qs.filter(q => !s[q.id] || s[q.id].box < 3);
      if (!qs.length) qs = DB.questions.filter(q => topics.includes(q.topic));
      const n = store.get('practiceN', 15);
      return runSession(shuffle(qs).slice(0, n), { title: `תרגול: ${topics.join(', ')}`, backHash: '#/practice' });
    }
    const counts = {}; DB.questions.forEach(q => { counts[q.topic] = counts[q.topic] || { n: 0, weak: 0, m: 0 }; counts[q.topic].n++; if (isWeak(s[q.id])) counts[q.topic].weak++; if (s[q.id] && s[q.id].box >= 3) counts[q.topic].m++; });
    const html = `<div class="card"><h2>בחר נושא</h2><div class="row"><label>שאלות בסבב: <input type="number" id="pn" min="5" max="100" value="${store.get('practiceN', 15)}"></label>
      <label><input type="checkbox" id="ponly" ${store.get('practiceOnlyNew', false) ? 'checked' : ''}> רק שאלות שעוד לא נשלטות</label></div></div>
      <div class="grid">${DB.topics.map(t => `<a class="tile" href="#/practice/${encodeURIComponent(t)}" style="border-right:6px solid ${topicColor(t)}"><b>${esc(t)}</b><small>${counts[t].n} שאלות · ${counts[t].m} נשלטות${counts[t].weak ? ` · <span style="color:var(--bad)">${counts[t].weak} לחיזוק</span>` : ''}</small><div class="progress"><i style="width:${100 * counts[t].m / counts[t].n}%"></i></div></a>`).join('')}
      <a class="tile" href="#/practice/${encodeURIComponent(DB.topics.join('|'))}"><b>🎲 כל הנושאים</b><small>${DB.counts.total} שאלות</small></a></div>`;
    setTimeout(() => { $('#pn').onchange = e => store.set('practiceN', Math.max(5, +e.target.value || 15)); $('#ponly').onchange = e => store.set('practiceOnlyNew', e.target.checked); }, 0);
    return html;
  };

  views.mistakes = () => {
    setTitle('חזרה על טעויות');
    const s = stats(); const weak = DB.questions.filter(q => isWeak(s[q.id]));
    if (!weak.length) return `<div class="card center"><h2>אין טעויות פתוחות 🎉</h2><p class="muted">שאלה נחשבת "סגורה" אחרי שעונים עליה נכון פעמיים ברצף.</p><a class="btn" href="#/practice">לתרגול</a></div>`;
    return runSession(shuffle(weak), { title: `חזרה על ${weak.length} טעויות`, backHash: '#/' });
  };

  views.exam = (state) => {
    setTitle('סימולציית מבחן');
    const cfg = store.get('examCfg', { n: 30, min: 40, pass: 70, src: 'all' });
    if (state !== 'go') {
      const exams = store.get('exams', []);
      const html = `<div class="card"><h2>הגדרות מבחן</h2>
        <div class="row"><label>מספר שאלות <input type="number" id="en" min="5" max="150" value="${cfg.n}"></label>
        <label>דקות <input type="number" id="em" min="5" max="180" value="${cfg.min}"></label>
        <label>ציון עובר % <input type="number" id="ep" min="50" max="100" value="${cfg.pass}"></label>
        <label>מקור <select id="es"><option value="all" ${cfg.src === 'all' ? 'selected' : ''}>הכול</option><option value="course" ${cfg.src === 'course' ? 'selected' : ''}>רק מבחני הקורס</option><option value="pdf" ${cfg.src === 'pdf' ? 'selected' : ''}>רק שאלות החוברת</option></select></label></div>
        <p class="muted small">התשובות נבדקות רק בסיום – כמו במבחן האמיתי. אפשר לחזור לשאלות קודמות.</p>
        <button class="btn" id="startExam">התחל מבחן</button></div>
        ${exams.length ? `<div class="card"><h3>מבחנים קודמים</h3><ul class="list">${exams.slice(-10).reverse().map(e => `<li>${new Date(e.at).toLocaleString('he-IL')} – ${e.right}/${e.n} · <span class="badge ${e.score >= e.pass ? '' : 'bad'}">${e.score}% ${e.score >= e.pass ? 'עבר' : 'נכשל'}</span></li>`).join('')}</ul></div>` : ''}`;
      setTimeout(() => { $('#startExam').onclick = () => { store.set('examCfg', { n: +$('#en').value || 30, min: +$('#em').value || 40, pass: +$('#ep').value || 70, src: $('#es').value }); location.hash = '#/exam/go'; }; }, 0);
      return html;
    }
    // running exam
    let pool = DB.questions; if (cfg.src === 'course') pool = pool.filter(q => q.source !== 'pdf'); if (cfg.src === 'pdf') pool = pool.filter(q => q.source === 'pdf');
    const qs = shuffle(pool).slice(0, cfg.n); const answers = new Array(qs.length).fill(null); let i = 0; let finished = false;
    const end = Date.now() + cfg.min * 60000; const wrap = document.createElement('div');
    const finish = () => {
      finished = true; clearInterval(tm);
      let right = 0; qs.forEach((q, k) => { const ok = answers[k] === q.correct; record(q.id, ok); if (ok) right++; });
      const score = Math.round(100 * right / qs.length); const exams = store.get('exams', []); exams.push({ at: Date.now(), n: qs.length, right, score, pass: cfg.pass }); store.set('exams', exams);
      wrap.innerHTML = `<div class="card center"><h2>${score >= cfg.pass ? '✅ עברת!' : '❌ לא עברת'}</h2><div class="stat"><div><b>${right}</b>נכונות</div><div><b>${qs.length - right}</b>שגויות</div><div><b>${score}%</b>ציון</div><div><b>${cfg.pass}%</b>נדרש</div></div><a class="btn" href="#/exam">מבחן חדש</a> <a class="btn secondary" href="#/mistakes">🔁 חזרה על טעויות</a></div><h3 class="center">סקירת השאלות</h3>`;
      qs.forEach((q, k) => { const c = renderQuestion(q, { index: k, total: qs.length, showAnswer: true }); if (answers[k] != null) c.querySelectorAll('.opt')[answers[k]].classList.add(answers[k] === q.correct ? 'picked' : 'wrong'); else c.querySelector('.feedback').insertAdjacentHTML('afterbegin', '<div class="why bad">לא נענתה</div>'); wrap.appendChild(c); });
      window.scrollTo(0, 0);
    };
    const tm = setInterval(() => { const left = end - Date.now(); if (left <= 0) { finish(); return; } const t = $('.timer', wrap); if (t) t.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`; }, 500);
    const render = () => {
      if (finished) return;
      wrap.innerHTML = `<div class="card"><div class="qhead"><span>נענו ${answers.filter(a => a != null).length}/${qs.length}</span><span class="timer">--:--</span></div><div class="progress"><i style="width:${100 * (i + 1) / qs.length}%"></i></div></div>`;
      const q = qs[i];
      const card = renderQuestion(q, { index: i, total: qs.length, immediate: false, onAnswer: pick => { answers[i] = pick; $('#nav-i').textContent = `נענו ${answers.filter(a => a != null).length}/${qs.length}`; } });
      if (answers[i] != null) card.querySelectorAll('.opt')[answers[i]].classList.add('picked');
      wrap.appendChild(card);
      const c = document.createElement('div'); c.className = 'card center';
      c.innerHTML = `<button class="btn secondary" id="prev" ${i === 0 ? 'disabled' : ''}>→ הקודמת</button> <span id="nav-i" class="muted small">נענו ${answers.filter(a => a != null).length}/${qs.length}</span> <button class="btn" id="next">${i === qs.length - 1 ? 'לסיום' : 'הבאה ←'}</button><br><button class="btn small secondary" id="fin" style="margin-top:10px">סיים והגש</button>
        <div class="row" style="justify-content:center;margin-top:10px">${qs.map((_, k) => `<button class="btn small ${k === i ? '' : 'secondary'}" data-k="${k}" style="min-width:36px;padding:4px 6px;${answers[k] != null ? 'opacity:1' : 'opacity:.55'}">${k + 1}</button>`).join('')}</div>`;
      $('#prev', c).onclick = () => { i--; render(); }; $('#next', c).onclick = () => { if (i === qs.length - 1) { if (confirm('לסיים ולהגיש את המבחן?')) finish(); } else { i++; render(); window.scrollTo(0, 0); } };
      $('#fin', c).onclick = () => { if (confirm('לסיים ולהגיש את המבחן?')) finish(); };
      c.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { i = +b.dataset.k; render(); window.scrollTo(0, 0); });
      wrap.appendChild(c);
    };
    render(); return wrap;
  };

  views.browse = () => {
    setTitle('כל השאלות והתשובות');
    const wrap = document.createElement('div');
    const s = stats();
    wrap.innerHTML = `<div class="card"><input id="search" type="search" placeholder="חיפוש בשאלות ובתשובות…" style="width:100%;font-size:1rem;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
      <div class="checkrow"><label><input type="radio" name="src" value="all" checked> הכול</label><label><input type="radio" name="src" value="course1"> מבחן 1</label>${DB.counts.course2 ? '<label><input type="radio" name="src" value="course2"> מבחן 2</label>' : ''}<label><input type="radio" name="src" value="pdf"> חוברת</label>
      <select id="topicSel"><option value="">כל הנושאים</option>${DB.topics.map(t => `<option>${esc(t)}</option>`).join('')}</select></div><div class="muted small" id="cnt"></div></div><div id="list"></div>`;
    const list = $('#list', wrap);
    const draw = () => {
      const term = $('#search', wrap).value.trim(); const src = wrap.querySelector('input[name=src]:checked').value; const topic = $('#topicSel', wrap).value;
      let qs = DB.questions.filter(q => (src === 'all' || q.source === src) && (!topic || q.topic === topic) && (!term || (q.q + ' ' + q.options.join(' ') + ' ' + (q.why || '')).includes(term)));
      $('#cnt', wrap).textContent = `${qs.length} שאלות`;
      list.innerHTML = qs.slice(0, 200).map(q => `<div class="card"><div class="qhead"><span>${esc(srcLabel(q))}</span><span><span class="tag">${esc(q.topic)}</span>${s[q.id] ? `<span class="tag">${s[q.id].right}✔ ${s[q.id].wrong}✘</span>` : ''}</span></div><div class="qtext">${rich(q.q)}</div>${qimg(q)}${picLegend(q)}
        ${q.options.map((o, k) => `<div class="opt ${k === q.correct ? 'correct' : ''}" style="cursor:default"><span class="letter">${HEB[k]}.</span> ${rich(o)}</div>`).join('')}${q.why ? `<div class="why small">${esc(q.why)}</div>` : ''}</div>`).join('') + (qs.length > 200 ? '<div class="card muted center">מוצגות 200 הראשונות – צמצם את החיפוש</div>' : '');
    };
    wrap.addEventListener('input', draw); wrap.addEventListener('change', draw); setTimeout(draw, 0);
    return wrap;
  };

  views.pages = () => {
    setTitle('דפי החוברת');
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="card muted small">15 עמודים סרוקים (עם ההדגשות והפתקים שלך). לחץ על עמוד להגדלה.</div>` + Array.from({ length: 15 }, (_, i) => `<div class="card"><h3>עמוד ${i + 1}${lessonForPage(i + 1)}</h3><div class="imgwrap"><img class="pageimg" loading="lazy" src="${imgSrc(i + 1)}" alt="עמוד ${i + 1}"></div></div>`).join('');
    return wrap;
  };
  const lessonForPage = p => { const ls = DB.lessons.filter(l => l.pages.includes(p)); return ls.length ? ` – <span class="muted small">${ls.map(l => `<a href="#/lesson/${l.id}">${esc(l.title)}</a>`).join(' · ')}</span>` : ''; };

  // ---------- driving mode (hands-free) ----------
  views.drive = (state) => {
    setTitle('מצב נהיגה 🚗');
    const cfg = Object.assign({ mode: 'quiz', src: 'all', topics: [], n: 20, wait: 8, rate: 1, readOptionsInListen: true, autoNext: 3 }, store.get('drive', {}));
    if (!TTS.ok) return `<div class="card"><h2>הדפדפן לא תומך בהקראה</h2><p>נסה ב-Chrome (אנדרואיד/מחשב) או Safari (iPhone).</p></div>`;
    if (state !== 'go') {
      const hv = TTS.hebrew();
      const html = `<div class="card"><h2>🚗 מצב נהיגה – הקראה קולית</h2>
        <p class="muted small">האפליקציה מקריאה כל שאלה ואת התשובות, ואתה עונה <b>בקול</b> ("א", "ב", "ג", "ד" או "אחת/שתיים/שלוש/ארבע") או בלחיצה על כפתור ענק. פקודות קוליות: <b>חזור</b> · <b>הבא</b> · <b>עצור</b>.</p>
        ${!hv.length ? `<div class="tip">⚠️ לא נמצא קול עברי במכשיר. באנדרואיד: הגדרות ← שפה ← המרת טקסט לדיבור ← Google TTS ← התקן עברית. ב-Windows: הגדרות ← זמן ושפה ← דיבור ← הוסף עברית. ההקראה תנסה בכל זאת.</div>` : ''}
        ${!SR ? `<div class="tip">ℹ️ זיהוי דיבור לא זמין בדפדפן זה – אפשר לענות בלחיצה על הכפתורים הגדולים, או לבחור "האזנה בלבד".</div>` : ''}
        <h3>מה להקריא?</h3>
        <div class="checkrow">
          <label><input type="radio" name="dmode" value="quiz" ${cfg.mode === 'quiz' ? 'checked' : ''}> 🎤 חידון – שאלה, אני עונה, משוב</label>
          <label><input type="radio" name="dmode" value="listen" ${cfg.mode === 'listen' ? 'checked' : ''}> 🎧 האזנה בלבד – שאלה ← תשובה נכונה ← הסבר (כמו פודקאסט)</label>
        </div>
        <div class="row"><label>מקור <select id="dsrc"><option value="all" ${cfg.src === 'all' ? 'selected' : ''}>הכול</option><option value="course" ${cfg.src === 'course' ? 'selected' : ''}>מבחני הקורס</option><option value="pdf" ${cfg.src === 'pdf' ? 'selected' : ''}>שאלות החוברת</option><option value="weak" ${cfg.src === 'weak' ? 'selected' : ''}>הטעויות שלי</option></select></label>
        <label>שאלות <input type="number" id="dn" min="5" max="200" value="${cfg.n}"></label>
        <label>זמן למענה (שנ') <input type="number" id="dwait" min="3" max="30" value="${cfg.wait}"></label>
        <label>השהיה לפני הבאה (שנ') <input type="number" id="dnext" min="0" max="15" value="${cfg.autoNext}"></label></div>
        <h3>נושאים <span class="muted small">(ריק = הכול)</span></h3>
        <div class="checkrow">${DB.topics.map(t => `<label><input type="checkbox" class="dtopic" value="${esc(t)}" ${cfg.topics.includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>
        <h3>קול</h3>
        <div class="row"><label>מהירות <input type="range" id="drate" min="0.6" max="1.5" step="0.1" value="${store.get('rate', 1)}"> <span id="drateV">${store.get('rate', 1)}</span></label>
        <label>קול <select id="dvoice"><option value="">אוטומטי</option>${TTS.voices.map(v => `<option value="${esc(v.voiceURI)}" ${store.get('voiceURI') === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label>
        <button class="btn secondary small" id="dtest">🔊 בדיקת קול</button></div>
        <label class="small"><input type="checkbox" id="dro" ${cfg.readOptionsInListen ? 'checked' : ''}> במצב האזנה – להקריא גם את כל האפשרויות</label>
        <div class="center" style="margin-top:14px"><button class="btn" id="dstart" style="font-size:1.4rem;padding:16px 34px">▶️ התחל</button></div>
        <p class="muted small">טיפ: המסך יישאר דלוק בזמן ההקראה. שים את הטלפון במעמד – ואל תיגע בו בנסיעה 🙂</p></div>`;
      setTimeout(() => {
        const save = () => { store.set('drive', { mode: document.querySelector('input[name=dmode]:checked').value, src: $('#dsrc').value, n: +$('#dn').value || 20, wait: +$('#dwait').value || 8, autoNext: +$('#dnext').value, topics: [...document.querySelectorAll('.dtopic:checked')].map(x => x.value), readOptionsInListen: $('#dro').checked }); store.set('rate', +$('#drate').value); store.set('voiceURI', $('#dvoice').value || null); TTS.load(); };
        $('#drate').oninput = e => { $('#drateV').textContent = e.target.value; };
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
    const wrap = document.createElement('div'); wrap.className = 'drive';
    let i = 0, right = 0, alive = true, paused = false, pendingPick = null, stepToken = 0, srBroken = false; const wrongList = [];
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const status = t => { const el = $('#dstatus', wrap); if (el) el.textContent = t; };
    const waitIfPaused = async () => { while (paused && alive) await sleep(200); };
    keepAwake(true);
    window.__driveDebug = () => ({ alive, paused, i, pendingPick, stepToken });
    const stop = () => { alive = false; TTS.cancel(); keepAwake(false); };
    const finishScreen = () => {
      wrap.innerHTML = `<div class="card center"><h2>סיימת 🎉</h2><div class="stat"><div><b>${right}</b>נכונות</div><div><b>${wrongList.length}</b>שגויות</div></div><a class="btn" href="#/drive">חזרה להגדרות</a> <a class="btn secondary" href="#/mistakes">🔁 טעויות</a></div>`;
      wrongList.forEach(q => wrap.appendChild(renderQuestion(q, { showAnswer: true })));
    };
    const draw = (q, phase) => {
      wrap.innerHTML = `<div class="card drivecard">
        <div class="qhead"><span>שאלה ${i + 1} / ${qs.length}</span><span id="dstatus" class="muted">${phase}</span></div>
        <div class="qtext big">${rich(q.q)}</div>${qimg(q)}
        <div class="driveopts">${q.options.map((o, k) => `<button class="opt driveopt" data-i="${k}"><span class="letter">${HEB[k]}</span><span class="otext">${rich(o)}</span></button>`).join('')}</div>
        <div id="dfeedback"></div>
        <div class="drivectl">
          <button class="btn secondary" id="drepeat">🔁 חזור</button>
          <button class="btn secondary" id="dpause">${paused ? '▶️ המשך' : '⏸ השהה'}</button>
          <button class="btn secondary" id="dskip">⏭ הבא</button>
          <button class="btn" id="dstop" style="background:var(--bad)">⏹ סיום</button>
        </div></div>`;
      wrap.querySelectorAll('.driveopt').forEach(b => b.onclick = () => { if (cfg.mode === 'quiz') { pendingPick = +b.dataset.i; TTS.cancel(); } });
      $('#drepeat', wrap).onclick = () => { pendingPick = 'repeat'; TTS.cancel(); };
      $('#dskip', wrap).onclick = () => { pendingPick = 'skip'; TTS.cancel(); };
      $('#dpause', wrap).onclick = () => { paused = !paused; $('#dpause', wrap).textContent = paused ? '▶️ המשך' : '⏸ השהה'; if (paused) TTS.cancel(); status(paused ? 'מושהה' : ''); };
      $('#dstop', wrap).onclick = () => { stop(); finishScreen(); };
    };
    const showResult = (q, pick) => {
      const ok = pick === q.correct;
      wrap.querySelectorAll('.driveopt').forEach(b => { const k = +b.dataset.i; b.disabled = true; if (k === q.correct) b.classList.add('correct'); if (pick === k && !ok) b.classList.add('wrong'); });
      $('#dfeedback', wrap).innerHTML = `<div class="why ${ok || pick == null ? '' : 'bad'}"><b>${pick == null ? '' : ok ? '✔ נכון!' : '✘ לא נכון.'}</b> התשובה: <b>${HEB[q.correct]}. ${esc(q.options[q.correct])}</b>${q.why ? `<br><span class="small">${esc(q.why)}</span>` : ''}</div>`;
    };
    // consume a manual button press or a voice command; returns {pick}|{cmd}|null
    const takeInput = () => { const p = pendingPick; pendingPick = null; if (p == null) return null; return typeof p === 'number' ? { pick: p } : { cmd: p }; };
    const speakChecked = async (t) => { await waitIfPaused(); if (!alive) return; await TTS.speak(t); };
    (async () => {
      await sleep(300);
      while (alive && i < qs.length) {
        const q = qs[i]; let redo = false; pendingPick = null;
        draw(q, 'מקריא…');
        await speakChecked(`שאלה ${i + 1}.`); await speakChecked(spoken(q.q));
        if (cfg.mode === 'quiz' || cfg.readOptionsInListen) for (let k = 0; k < q.options.length && alive; k++) { if (takeInputPeek()) break; await speakChecked(`${HEB[k]}. ${spoken(q.options[k])}`); }
        if (!alive) break;
        let result = null;
        if (cfg.mode === 'quiz') {
          // answer window: manual buttons + speech recognition, retry a couple of times on "unknown"
          const deadline = Date.now() + cfg.wait * 1000 * 3;
          let tries = 0;
          while (alive && !result) {
            const manual = takeInput(); if (manual) { result = manual; break; }
            await waitIfPaused();
            status(SR ? '🎤 מקשיב… אמור א/ב/ג/ד' : 'לחץ על התשובה');
            const t0 = Date.now();
            let heard = (SR && !srBroken) ? await listen(cfg.wait * 1000) : null;
            if (SR && !srBroken && heard == null && Date.now() - t0 < 1500) { srBroken = true; status('🎤 המיקרופון לא זמין – לחץ על התשובה'); }
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
          else if (result.cmd === 'pause') { paused = true; $('#dpause', wrap).textContent = '▶️ המשך'; status('מושהה – לחץ המשך'); await waitIfPaused(); redo = true; }
          else if (result.cmd === 'skip') { /* fallthrough: reveal answer without scoring */ showResult(q, null); await speakChecked(`התשובה: ${HEB[q.correct]}. ${spoken(q.options[q.correct])}`); }
          else {
            const pick = result.pick; const ok = pick === q.correct;
            if (pick != null) { record(q.id, ok); if (ok) right++; else wrongList.push(q); }
            showResult(q, pick);
            status('');
            if (pick == null) await speakChecked(`לא נענתה. התשובה הנכונה: ${HEB[q.correct]}. ${spoken(q.options[q.correct])}.`);
            else if (ok) await speakChecked(`נכון! ${HEB[q.correct]}. ${spoken(q.options[q.correct])}.`);
            else await speakChecked(`לא נכון. בחרת ${HEB[pick]}. התשובה הנכונה: ${HEB[q.correct]}. ${spoken(q.options[q.correct])}.`);
            if (q.why) await speakChecked(q.why);
          }
        } else {
          // listen-only
          await sleep(600);
          showResult(q, null);
          await speakChecked(`התשובה הנכונה: ${HEB[q.correct]}. ${spoken(q.options[q.correct])}.`);
          if (q.why) await speakChecked(q.why);
          const c = takeInput(); if (c && c.cmd === 'repeat') redo = true; if (c && c.cmd === 'stop') { stop(); finishScreen(); return; }
        }
        if (!alive) break;
        if (!redo) {
          // pause before next; allow repeat/stop during it
          status('השאלה הבאה בעוד רגע…');
          const end = Date.now() + cfg.autoNext * 1000;
          while (Date.now() < end && alive) { const c = takeInput(); if (c && c.cmd === 'repeat') { redo = true; break; } if (c && c.cmd === 'stop') { stop(); finishScreen(); return; } if (c && c.cmd === 'skip') break; await sleep(150); }
          if (!redo) i++;
        }
      }
      if (alive) { stop(); await TTS.speak(`סיימת. ${right} תשובות נכונות מתוך ${qs.length}.`); finishScreen(); }
    })();
    function takeInputPeek() { return pendingPick != null; }
    // leaving the view stops speech
    const onHash = () => { if (!location.hash.startsWith('#/drive/go')) { stop(); window.removeEventListener('hashchange', onHash); } };
    window.addEventListener('hashchange', onHash);
    return wrap;
  };

  views.pics = () => {
    setTitle('גלריית דגלים וסימנים');
    if (!PICS) return '<div class="card">הגלריה לא נטענה</div>';
    const numOf = key => Object.keys(PICS.NUMBERS).filter(n => PICS.NUMBERS[n] === key).map(n => `תמונה ${n}`).join(', ');
    const sec = (title, obj, prefix, sub) => `<div class="card"><h2>${title}</h2>${sub ? `<p class="muted small">${sub}</p>` : ''}<div class="gallery">${Object.keys(obj).map(k => `<figure class="pic"><div class="picsvg">${obj[k].svg}</div><figcaption>${prefix === 'flag' ? `<b>${k}</b> · ${esc(obj[k].name)}<br>` : ''}${esc(obj[k].he)}${obj[k].detail ? `<br><span class="muted">${esc(obj[k].detail)}</span>` : ''}${numOf(prefix + ':' + k) ? `<br><span class="tag">${numOf(prefix + ':' + k)}</span>` : ''}</figcaption></figure>`).join('')}</div></div>`;
    return `<div class="card muted small">כל התמונות מצוירות לפי התקן הבין-לאומי. מספרי "תמונה" הם המספרים שמופיעים בשאלות המבחן.</div>` +
      sec('🚩 דגלי קוד (ICS)', PICS.FLAGS, 'flag', 'הבולטים למבחן: A צוללנים · B חומרים מסוכנים · O אדם בים · N מעל C מצוקה · U סכנה · P עומד להפליג') +
      sec('⚫ סימני יום', PICS.SHAPES, 'shape') +
      sec('💡 אורות ואותות מעגנה', PICS.MISC, 'misc') +
      sec('📯 אותות קוליים', PICS.SOUNDS, 'sound', '● קצרה (כשנייה) · ▬ ארוכה (4–6 שניות)');
  };

  views.howto = () => {
    setTitle('איך נרשמים למבחן');
    const h = DB.howto || {};
    return `<div class="card"><h2>${esc(h.title || 'איך מתחילים')}</h2>${(h.steps || []).map(s => `<h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>`).join('')}<p class="muted small">מקור: <a href="${esc(h.source || '#')}" target="_blank" rel="noopener">אתר הקורס</a></p></div>
      <div class="card"><h3>איפוס התקדמות</h3><p class="muted small">מוחק את כל הסטטיסטיקות והמבחנים השמורים במכשיר הזה.</p><button class="btn secondary" onclick="if(confirm('לאפס את כל ההתקדמות?')){localStorage.clear();location.reload();}">איפוס</button></div>`;
  };

  // ---------- router ----------
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const v = parts[0] || 'home'; const rest = parts.slice(1);
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
    document.querySelectorAll('img.pageimg').forEach(x => x.classList.remove('zoom'));
    const fn = views[v] || views.home;
    const out = fn(...rest);
    app.innerHTML = ''; if (typeof out === 'string') app.innerHTML = out; else app.appendChild(out);
    fillPics(app);
    window.scrollTo(0, 0);
  }
  app.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('pageimg')) e.target.classList.toggle('zoom'); });
  window.addEventListener('hashchange', route);

  // ---------- boot ----------
  function boot(data) {
    DB = data; route();
    statusEl.textContent = `${DB.counts.total} שאלות · גרסה ${DB.version} · ${navigator.onLine ? 'מקוון' : 'לא מקוון (עובד!)'}`;
    window.addEventListener('online', () => statusEl.textContent = statusEl.textContent.replace(/לא מקוון.*/, 'מקוון'));
    window.addEventListener('offline', () => statusEl.textContent = statusEl.textContent.replace(/מקוון$/, 'לא מקוון (עובד!)'));
  }
  if (window.__BUNDLE__) boot(window.__BUNDLE__);
  else fetch('data/bundle.json').then(r => r.json()).then(boot).catch(e => { app.innerHTML = `<div class="card">שגיאה בטעינת הנתונים: ${esc(e.message)}</div>`; });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
