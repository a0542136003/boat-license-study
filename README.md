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
