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

  // ---------- question card ----------
  function renderQuestion(q, opts = {}) {
    const { index, total, onAnswer, showAnswer } = opts;
    const div = document.createElement('div'); div.className = 'card question';
    div.innerHTML = `<div class="qhead"><span>${index != null ? `שאלה ${index + 1}${total ? ' / ' + total : ''}` : ''}</span><span><span class="tag">${esc(q.topic)}</span><span class="tag">${esc(srcLabel(q))}</span></span></div>
      <div class="qtext">${esc(q.q)}</div>
      <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="letter">${HEB[i]}.</span> ${esc(o)}</button>`).join('')}</div>
      <div class="feedback"></div>`;
    const buttons = [...div.querySelectorAll('.opt')];
    const reveal = picked => {
      buttons.forEach(b => { b.disabled = true; const i = +b.dataset.i; if (i === q.correct) b.classList.add('correct'); if (picked === i && i !== q.correct) b.classList.add('wrong'); if (picked === i) b.classList.add('picked'); });
      const ok = picked === q.correct;
      $('.feedback', div).innerHTML = `<div class="why ${ok ? '' : 'bad'}"><b>${ok ? '✔ נכון!' : '✘ לא נכון.'}</b> התשובה הנכונה: <b>${HEB[q.correct]}. ${esc(q.options[q.correct])}</b>${q.why ? `<br><span class="small">${esc(q.why)}</span>` : ''}</div>`;
    };
    if (showAnswer) reveal(null);
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
        <a class="tile" href="#/exam"><span class="big">📝</span><b>סימולציית מבחן</b><small>שאלות אקראיות עם טיימר וציון</small></a>
        <a class="tile" href="#/mistakes"><span class="big">🔁</span><b>חזרה על טעויות</b><small>${weak ? weak + ' שאלות מחכות' : 'אין טעויות פתוחות'}</small></a>
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
      list.innerHTML = qs.slice(0, 200).map(q => `<div class="card"><div class="qhead"><span>${esc(srcLabel(q))}</span><span><span class="tag">${esc(q.topic)}</span>${s[q.id] ? `<span class="tag">${s[q.id].right}✔ ${s[q.id].wrong}✘</span>` : ''}</span></div><div class="qtext">${esc(q.q)}</div>
        ${q.options.map((o, k) => `<div class="opt ${k === q.correct ? 'correct' : ''}" style="cursor:default"><span class="letter">${HEB[k]}.</span> ${esc(o)}</div>`).join('')}${q.why ? `<div class="why small">${esc(q.why)}</div>` : ''}</div>`).join('') + (qs.length > 200 ? '<div class="card muted center">מוצגות 200 הראשונות – צמצם את החיפוש</div>' : '');
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
