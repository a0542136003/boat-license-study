/* Inline SVG pictures for the exam: ICS code flags, day shapes, marina/harbour signals, sound signals.
   window.PICS = { flag(L), shape(key), sound(key), svg(key), byNumber(n), FLAGS, SHAPES, SOUNDS, MISC, NUMBERS } */
(function () {
  const RED = '#c8102e', BLUE = '#0b3f9e', YEL = '#ffd100', WHT = '#ffffff', BLK = '#111111';
  const W = 120, H = 80;
  const wrap = (inner, w = W, h = H, extra = '') => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" ${extra}><rect width="${w}" height="${h}" rx="6" fill="#f4f4f5"/>${inner}</svg>`;
  const pole = `<rect x="0" y="0" width="4" height="${H}" fill="#6b5b3e"/>`;
  const R = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
  const P = (pts, f) => `<polygon points="${pts}" fill="${f}"/>`;
  const F = { x: 4, w: W - 4 }; // flag area after pole
  const full = f => R(F.x, 0, F.w, H, f);
  const swallow = (leftFill, rightFill) => { // A/B: swallowtail cut on fly side
    const cut = 22, mid = H / 2;
    const bodyL = P(`${F.x},0 ${F.x + F.w / 2},0 ${F.x + F.w / 2},${H} ${F.x},${H}`, leftFill);
    const bodyR = P(`${F.x + F.w / 2},0 ${W},0 ${W - cut},${mid} ${W},${H} ${F.x + F.w / 2},${H}`, rightFill);
    return bodyL + bodyR;
  };
  const stripesH = cols => cols.map((c, i) => R(F.x, i * H / cols.length, F.w, H / cols.length + .5, c)).join('');
  const stripesV = cols => cols.map((c, i) => R(F.x + i * F.w / cols.length, 0, F.w / cols.length + .5, H, c)).join('');
  const halvesV = (l, r) => R(F.x, 0, F.w / 2, H, l) + R(F.x + F.w / 2, 0, F.w / 2, H, r);
  const quarters = (tl, tr, bl, br) => R(F.x, 0, F.w / 2, H / 2, tl) + R(F.x + F.w / 2, 0, F.w / 2, H / 2, tr) + R(F.x, H / 2, F.w / 2, H / 2, bl) + R(F.x + F.w / 2, H / 2, F.w / 2, H / 2, br);
  const checker = (a, b, n = 4) => { let s = ''; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += R(F.x + i * F.w / n, j * H / n, F.w / n + .5, H / n + .5, (i + j) % 2 ? b : a); return s; };
  const border = (outer, inner, k = 0.33) => full(outer) + R(F.x + F.w * k / 2, H * k / 2, F.w * (1 - k), H * (1 - k), inner);
  const cx = F.x + F.w / 2, cy = H / 2;

  const FLAGS = {
    A: { desc: 'דגל חציו לבן וחציו כחול עם זנב סנונית', he: 'צוללנים במים – שמור מרחק (200 מ\')', name: 'Alpha', svg: swallow(WHT, BLUE) },
    B: { desc: 'דגל אדום עם זנב סנונית', he: 'טוען / פורק / נושא חומרים מסוכנים', name: 'Bravo', svg: swallow(RED, RED) },
    C: { desc: 'דגל פסים אופקיים כחול לבן אדום לבן כחול', he: 'חיובי (כן) · עם N – מצוקה', name: 'Charlie', svg: stripesH([BLUE, WHT, RED, WHT, BLUE]) },
    D: { desc: 'דגל צהוב עם פס כחול רחב באמצע', he: 'התרחק – אני מתמרן בקושי', name: 'Delta', svg: stripesH([YEL, BLUE, BLUE, YEL]) },
    E: { desc: 'דגל כחול מעל אדום', he: 'אני משנה אורחי ימינה', name: 'Echo', svg: stripesH([BLUE, RED]) },
    F: { desc: 'דגל לבן עם מעוין אדום', he: 'אני מושבת – התקשר איתי', name: 'Foxtrot', svg: full(WHT) + P(`${cx},8 ${cx + 30},${cy} ${cx},${H - 8} ${cx - 30},${cy}`, RED) },
    G: { desc: 'דגל פסים אנכיים צהוב וכחול', he: 'אני זקוק לנתב', name: 'Golf', svg: stripesV([YEL, BLUE, YEL, BLUE, YEL, BLUE]) },
    H: { desc: 'דגל חציו לבן וחציו אדום', he: 'נתב על הספינה', name: 'Hotel', svg: halvesV(WHT, RED) },
    I: { desc: 'דגל צהוב עם עיגול שחור', he: 'אני משנה אורחי שמאלה', name: 'India', svg: full(YEL) + `<circle cx="${cx}" cy="${cy}" r="18" fill="${BLK}"/>` },
    J: { desc: 'דגל כחול לבן כחול אופקי', he: 'שריפה על הספינה, נושא מטען מסוכן – התרחק', name: 'Juliett', svg: stripesH([BLUE, WHT, BLUE]) },
    K: { desc: 'דגל חציו צהוב וחציו כחול', he: 'ברצוני לתקשר איתך', name: 'Kilo', svg: halvesV(YEL, BLUE) },
    L: { desc: 'דגל ריבועים צהוב ושחור', he: 'עצור את ספינתך מיד', name: 'Lima', svg: quarters(YEL, BLK, BLK, YEL) },
    M: { desc: 'דגל כחול עם איקס לבן', he: 'ספינתי עצורה ואינה עושה דרכה במים', name: 'Mike', svg: full(BLUE) + `<path d="M${F.x},0 L${W},${H} M${W},0 L${F.x},${H}" stroke="${WHT}" stroke-width="12"/>` },
    N: { desc: 'דגל משבצות כחול לבן', he: 'שלילי (לא) · עם C – מצוקה', name: 'November', svg: checker(BLUE, WHT) },
    O: { desc: 'דגל אלכסוני אדום וצהוב', he: 'אדם בים!', name: 'Oscar', svg: P(`${F.x},0 ${W},0 ${W},${H}`, RED) + P(`${F.x},0 ${F.x},${H} ${W},${H}`, YEL) },
    P: { desc: 'דגל כחול עם מלבן לבן במרכז', he: 'הספינה עומדת להפליג – כל אנשי הצוות לסיפון', name: 'Papa', svg: border(BLUE, WHT) },
    Q: { desc: 'דגל צהוב', he: 'ספינתי בריאה – מבקש היתר כניסה (פרטיקה)', name: 'Quebec', svg: full(YEL) },
    R: { desc: 'דגל אדום עם צלב צהוב', he: '(אין משמעות בודדת)', name: 'Romeo', svg: full(RED) + `<path d="M${cx},0 V${H} M${F.x},${cy} H${W}" stroke="${YEL}" stroke-width="12"/>` },
    S: { desc: 'דגל לבן עם מלבן כחול במרכז', he: 'מנועיי פועלים לאחור', name: 'Sierra', svg: border(WHT, BLUE) },
    T: { desc: 'דגל פסים אנכיים אדום לבן כחול', he: 'התרחק ממני – עוסק בדייג זוגי (מכמורת)', name: 'Tango', svg: stripesV([RED, WHT, BLUE]) },
    U: { desc: 'דגל ריבועים אדום ולבן', he: 'אתה מפליג לעבר סכנה', name: 'Uniform', svg: quarters(RED, WHT, WHT, RED) },
    V: { desc: 'דגל לבן עם איקס אדום', he: 'אני זקוק לסיוע', name: 'Victor', svg: full(WHT) + `<path d="M${F.x},0 L${W},${H} M${W},0 L${F.x},${H}" stroke="${RED}" stroke-width="12"/>` },
    W: { desc: 'דגל כחול לבן אדום מקוננים', he: 'אני זקוק לסיוע רפואי', name: 'Whiskey', svg: full(BLUE) + R(F.x + 20, 14, F.w - 40, H - 28, WHT) + R(F.x + 40, 28, F.w - 80, H - 56, RED) },
    X: { desc: 'דגל לבן עם צלב כחול', he: 'הפסק את כוונותיך ושים לב לאותותיי', name: 'X-ray', svg: full(WHT) + `<path d="M${cx},0 V${H} M${F.x},${cy} H${W}" stroke="${BLUE}" stroke-width="12"/>` },
    Y: { desc: 'דגל פסים אלכסוניים צהוב ואדום', he: 'אני גורר עוגן', name: 'Yankee', svg: full(YEL) + [0, 1, 2, 3, 4].map(i => `<path d="M${F.x + i * 30 - 20},${H} L${F.x + i * 30 + 20},0" stroke="${RED}" stroke-width="10"/>`).join('') },
    Z: { desc: 'דגל ארבעה משולשים צהוב שחור אדום כחול', he: 'אני זקוק לגוררת', name: 'Zulu', svg: P(`${F.x},0 ${W},0 ${cx},${cy}`, YEL) + P(`${F.x},0 ${F.x},${H} ${cx},${cy}`, BLK) + P(`${F.x},${H} ${W},${H} ${cx},${cy}`, RED) + P(`${W},0 ${W},${H} ${cx},${cy}`, BLUE) },
  };
  Object.keys(FLAGS).forEach(k => FLAGS[k].svg = wrap(`<clipPath id="fc${k}"><rect x="${F.x}" y="0" width="${F.w}" height="${H}"/></clipPath>` + pole + `<g clip-path="url(#fc${k})">` + FLAGS[k].svg + `</g><rect x="${F.x}" y="0" width="${F.w}" height="${H}" fill="none" stroke="#999" stroke-width="1"/>`));

  // ---- day shapes: drawn on a mast, 120x120 ----
  const SW = 120, SH = 120, mx = 60;
  const mast = `<rect x="${mx - 2}" y="6" width="4" height="${SH - 6}" fill="#555"/>`;
  const ball = (y, x = mx, r = 12) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${BLK}"/>`;
  const diamond = (y, x = mx, s = 13) => `<polygon points="${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}" fill="${BLK}"/>`;
  const coneUp = (y, x = mx, s = 13) => `<polygon points="${x},${y - s} ${x + s},${y + s} ${x - s},${y + s}" fill="${BLK}"/>`;
  const coneDown = (y, x = mx, s = 13) => `<polygon points="${x - s},${y - s} ${x + s},${y - s} ${x},${y + s}" fill="${BLK}"/>`;
  const cyl = (y, x = mx) => `<rect x="${x - 10}" y="${y - 20}" width="20" height="40" rx="3" fill="${BLK}"/>`;
  const yard = (y, half = 40) => `<rect x="${mx - half}" y="${y - 2}" width="${half * 2}" height="4" fill="#555"/>`;
  const S = (inner) => wrap(mast + inner, SW, SH);
  const SHAPES = {
    ball1: { he: 'עוגן', detail: 'כדור שחור אחד בחרטום', svg: S(ball(40)) },
    ball2: { he: 'ללא שליטה', detail: 'שני כדורים אנכיים', svg: S(ball(30) + ball(64)) },
    ball3: { he: 'על שרטון', detail: 'שלושה כדורים אנכיים', svg: S(ball(24) + ball(54) + ball(84)) },
    ram: { he: 'מוגבל בכושר התמרון', detail: 'כדור – מעוין – כדור', svg: S(ball(24) + diamond(56) + ball(88)) },
    ramObst: { he: 'מוגבל עם מכשול', detail: 'כדור-מעוין-כדור; 2 כדורים בצד האסור, 2 מעוינים בצד הפנוי', svg: S(yard(56) + ball(22, mx, 10) + diamond(52, mx, 11) + ball(82, mx, 10) + ball(38, 22, 8) + ball(60, 22, 8) + diamond(38, 98, 9) + diamond(60, 98, 9)) },
    cyl: { he: 'מוגבל בשל השוקע', detail: 'גליל שחור', svg: S(cyl(56)) },
    diamond: { he: 'גרירה מעל 200 מ\'', detail: 'מעוין – על הגורר והנגרר', svg: S(diamond(50, mx, 18)) },
    hourglass: { he: 'עוסק בדייג', detail: 'שני חרוטים קודקוד מול קודקוד', svg: S(coneDown(40) + coneUp(66)) },
    hourglassCone: { he: 'דייג – רשתות מעל 150 מ\'', detail: 'שעון חול + חרוט קודקוד למעלה בכיוון הרשת', svg: S(yard(50, 40) + coneDown(30) + coneUp(56) + coneUp(70, 96, 10)) },
    coneDown: { he: 'מפרשית שמנועה פועל', detail: 'חרוט קודקוד למטה', svg: S(coneDown(50, mx, 16)) },
    tri3: { he: 'שולת מוקשים – התרחק 1000 מ\'', detail: 'שלושה כדורים במשולש', svg: S(yard(60, 34) + ball(28) + ball(60, 26) + ball(60, 94)) },
    flagBall: { he: 'מצוקה', detail: 'דגל מרובע וכדור מעליו / מתחתיו', svg: S(`<rect x="${mx + 2}" y="14" width="42" height="34" fill="#e0791b" stroke="#333"/>` + ball(74)) },
  };
  // ---- marina / harbour / lights ----
  const MISC = {
    redPennant: { desc: 'נס אדום משולש', he: 'אזהרת סערה ביום – נס אדום (מעל בופור 5)', svg: S(P(`${mx + 2},14 ${mx + 50},34 ${mx + 2},54`, RED)) },
    blackBall: { desc: 'כדור שחור', he: 'אזהרת סערה ביום – כדור שחור (מעל בופור 5)', svg: S(ball(36, mx, 16)) },
    whiteGreen: { desc: 'אור לבן מעל אור ירוק', he: 'אזהרת סערה בלילה – אור לבן מעל אור ירוק', svg: wrap(`<rect width="120" height="120" fill="#101820"/><circle cx="60" cy="38" r="15" fill="#fff"/><circle cx="60" cy="82" r="15" fill="#25c04a"/>`, SW, SH) },
    entrance: { desc: 'שני אורות: ירוק מימין ואדום משמאל', he: 'כניסה לנמל בלילה – ירוק מימין, אדום משמאל (תמונה 71)', svg: wrap(`<rect width="120" height="120" fill="#101820"/><circle cx="90" cy="60" r="16" fill="#25c04a"/><circle cx="30" cy="60" r="16" fill="#e53935"/><text x="60" y="108" fill="#ccc" font-size="12" text-anchor="middle">כניסה</text>`, SW, SH) },
    bow: { desc: 'אור אדום ואור ירוק זה ליד זה', he: 'אדום + ירוק יחד – חרטום מולך', svg: wrap(`<rect width="120" height="120" fill="#101820"/><circle cx="40" cy="60" r="14" fill="#e53935"/><circle cx="80" cy="60" r="14" fill="#25c04a"/>`, SW, SH) },
    stern: { desc: 'אור לבן בודד', he: 'לבן בודד – ירכתיים (מתרחק / אתה עוקף)', svg: wrap(`<rect width="120" height="120" fill="#101820"/><circle cx="60" cy="60" r="14" fill="#fff"/>`, SW, SH) },
    redOnly: { desc: 'אור אדום בודד', he: 'רק אדום – בא מימינך, אתה מפנה', svg: wrap(`<rect width="120" height="120" fill="#101820"/><circle cx="60" cy="60" r="14" fill="#e53935"/>`, SW, SH) },
    greenOnly: { desc: 'אור ירוק בודד', he: 'רק ירוק – בא משמאלך, הוא מפנה', svg: wrap(`<rect width="120" height="120" fill="#101820"/><circle cx="60" cy="60" r="14" fill="#25c04a"/>`, SW, SH) },
    diverFlag: { desc: 'דגל אדום עם פס לבן אלכסוני', he: 'דגל צוללים (אמריקאי) – אדום עם פס לבן אלכסוני', svg: wrap(pole + full(RED) + `<path d="M${W},0 L${F.x},${H}" stroke="${WHT}" stroke-width="14"/>`) },
  };
  // ---- sound signals ----
  const dot = x => `<circle cx="${x}" cy="30" r="7" fill="${BLK}"/>`, dash = x => `<rect x="${x}" y="24" width="34" height="12" rx="6" fill="${BLK}"/>`;
  const seq = (pat, label) => { let x = 8, s = ''; for (const c of pat) { if (c === '.') { s += dot(x + 7); x += 20; } else if (c === '-') { s += dash(x); x += 42; } else x += 12; } return wrap(s + `<text x="${Math.max(x, 60) / 2}" y="55" font-size="11" text-anchor="middle" fill="#666">${label}</text>`, Math.max(x + 8, 120), 60); };
  const SOUNDS = {
    s1: { desc: 'צפירה קצרה אחת', he: 'אני פונה ימינה', svg: seq('.', 'קצרה אחת') },
    s2: { desc: 'שתי צפירות קצרות', he: 'אני פונה שמאלה', svg: seq('..', 'שתי קצרות') },
    s3: { desc: 'שלוש צפירות קצרות', he: 'מנועיי פועלים לאחור', svg: seq('...', 'שלוש קצרות') },
    s5: { desc: 'חמש צפירות קצרות', he: 'איני מבין כוונותיך / ספק (תמונה 115)', svg: seq('.....', 'חמש קצרות (או יותר)') },
    sos: { desc: 'שלוש קצרות, שלוש ארוכות, שלוש קצרות', he: 'SOS – מצוקה (תמונה 119)', svg: seq('... --- ...', '3 קצרות · 3 ארוכות · 3 קצרות') },
    fog1: { desc: 'צפירה ארוכה אחת', he: 'ערפל: ממוכן עושה דרכו במים (כל 2 דק\')', svg: seq('-', 'ארוכה אחת') },
    fog2: { desc: 'שתי צפירות ארוכות', he: 'ערפל: ממוכן בדרך שנעצר', svg: seq('--', 'שתי ארוכות') },
    fog3: { desc: 'צפירה ארוכה ושתי קצרות', he: 'ערפל: ללא שליטה / מוגבל / מפרשית / דייג / גורר (תמונה 122)', svg: seq('-..', 'ארוכה + 2 קצרות') },
    fog4: { desc: 'צפירה ארוכה ושלוש קצרות', he: 'ערפל: הנגרר האחרון', svg: seq('-...', 'ארוכה + 3 קצרות') },
    ovR: { desc: 'שתי ארוכות וקצרה', he: 'עקיפה במעבר צר: אעקוף מימינך', svg: seq('--.', '2 ארוכות + קצרה') },
    ovL: { desc: 'שתי ארוכות ושתי קצרות', he: 'עקיפה במעבר צר: אעקוף משמאלך', svg: seq('--..', '2 ארוכות + 2 קצרות') },
    agree: { desc: 'ארוכה קצרה ארוכה קצרה', he: 'הסכמה לעקיפה', svg: seq('-.-.', 'ארוכה-קצרה-ארוכה-קצרה') },
    cont: { desc: 'צפירה רצופה', he: 'צפירה מתמשכת – מצוקה', svg: seq('----', 'רצופה ללא הפסק') },
  };
  // ---- exam picture numbers (from the harvested quizzes) ----
  const NUMBERS = { 71: 'misc:entrance', 77: 'shape:ball1', 79: 'shape:ram', 80: 'shape:ball2', 82: 'shape:coneDown', 83: 'shape:flagBall', 84: 'shape:hourglass', 85: 'shape:coneUpNet', 86: 'shape:diamond',
    91: 'flag:U', 92: 'flag:N', 93: 'flag:C', 94: 'flag:T', 95: 'flag:B', 96: 'flag:S', 97: 'flag:G', 98: 'flag:A', 99: 'flag:K', 100: 'flag:H', 101: 'flag:L', 102: 'flag:D', 103: 'flag:I', 104: 'flag:O', 105: 'flag:E', 106: 'flag:Q', 107: 'flag:X', 108: 'flag:P', 109: 'flag:F', 110: 'flag:V',
    115: 'sound:s5', 119: 'sound:sos', 122: 'sound:fog3' };
  SHAPES.coneUpNet = { he: 'חרוט קודקוד למעלה (עם שעון חול = רשתות מעל 150 מ\')', detail: 'חרוט קודקוד למעלה', svg: S(coneUp(50, mx, 16)) };

  Object.values(SHAPES).forEach(o => { if (!o.desc) o.desc = o.detail; });
  const svg = key => { const [g, k] = key.split(':'); const src = { flag: FLAGS, shape: SHAPES, sound: SOUNDS, misc: MISC }[g]; return src && src[k] ? src[k].svg : ''; };
  const info = key => { const [g, k] = key.split(':'); const src = { flag: FLAGS, shape: SHAPES, sound: SOUNDS, misc: MISC }[g]; return src && src[k] ? src[k] : null; };
  const byNumber = n => NUMBERS[n] ? { key: NUMBERS[n], svg: svg(NUMBERS[n]), info: info(NUMBERS[n]) } : null;
  window.PICS = { FLAGS, SHAPES, SOUNDS, MISC, NUMBERS, svg, info, byNumber, flag: L => FLAGS[L] && FLAGS[L].svg };
})();
