# משיט 12 – Boat license (סירה א׳) study app

Offline-first Hebrew study app for the Israeli boat-license theory exam (משיט 12 / סירה א׳).

* **`docs/`** – the web app (GitHub Pages root). Vanilla HTML/JS, RTL, installable PWA with a service worker that precaches everything (works offline after the first visit).
* **`dist/boat-license-offline.html`** – the same app as one self-contained file (questions + page scans inlined). Copy it to a phone / Drive / USB and open it – no server, no network needed.
* **`data/`** – the source of truth:
  * `raw/form1_questions.json`, `raw/form1_answers.json` – quiz 1 harvested from the course's Google Form (53 questions, answer key read from the "View score" page).
  * `form1_meta.json` – topic + explanation per question.
  * `pdf_questions.json` – 65 practice questions written from the scanned course booklet.
  * `lessons.json` – 12 lessons (HTML) built from the booklet pages.
  * `howto.json` – registration steps (from the course site's public page).
* **`tools/`**
  * `render_pdf.py` – renders `boat_course_somelessons-rotated.pdf` to `docs/pdf/pNN.jpg` (upright) and `data/raw/pages/*.png`.
  * `build_data.py` – merges data → `docs/data/bundle.json` and builds `dist/boat-license-offline.html`.

## Update workflow

```bash
python tools/render_pdf.py      # only if the PDF changed
python tools/build_data.py      # rebuild bundle + offline file
```

Bump `VERSION` in `docs/sw.js` when app files change so installed PWAs refresh.

## Adding quiz 2

Save the harvested key as `data/raw/form2_answers.json` (same shape as form1) and optional `data/form2_meta.json`, then run `build_data.py`.

## Local preview

```bash
python -m http.server 8765 --directory docs
```

## Driving mode (speech)

`#/drive` — hands-free study using the browser's Web Speech API:
* **TTS** (`speechSynthesis`, `he-IL`) reads the question, the options, the verdict and the explanation. Needs a Hebrew voice on the device (Android: Google TTS → Hebrew; iOS: built-in Carmit; Windows: add Hebrew speech pack).
* **Voice answers** (`SpeechRecognition`, Chrome/Android + Safari): say `א/ב/ג/ד` or `אחת/שתיים/שלוש/ארבע`; commands `חזור`, `הבא`, `עצור`. Falls back to big tap buttons when the mic is unavailable. Recognition needs network; TTS works offline if the voice is installed.
* Listen-only mode reads question → correct answer → explanation ("podcast").
* Screen Wake Lock keeps the display on while running.

## Google Sheet tracking (v7)

Every answer/skip is logged to a Google Sheet via a tiny Apps Script web app (no backend, no login in the app):

1. Create a Google Sheet → **Extensions → Apps Script** → paste `tools/apps_script.gs` (replace Code.gs) → save.
2. **Deploy → New deployment → Web app**, *Execute as: Me*, *Who has access: Anyone* → Deploy → copy the `/exec` URL.
3. In the app: menu → **סנכרון לגיליון** → paste URL → שמור → בדוק חיבור.

Sheets: `Log` (append-only: timestamp, device, mode, question_id, source, question_no, topic, question, answered, correct_answer, result right/wrong/skipped, seconds) and `Stats` (per question, weakest first; also via the sheet menu "משיט 12 → עדכן סטטיסטיקה").
The app queues events offline (`localStorage`), flushes when online, and pulls per-question aggregates back (`?action=stats`) so progress is shared across devices. `tools/mock_sheet.py` is a local stand-in for testing.

## Practice UX (v7)
Question-first flow: quick start / resume, per-topic launcher, keyboard `1–4`, `S` = skip & reveal, `Enter` = next; skipped questions count as "לחיזוק" until answered correctly twice in a row.
