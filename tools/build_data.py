"""Merge raw quiz answers + metadata + PDF questions + lessons into docs/data/*.json,
then build dist/boat-license-offline.html (single self-contained file)."""
import json, os, base64, re, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data'); RAW = os.path.join(DATA, 'raw')
DOCS = os.path.join(ROOT, 'docs'); DOCS_DATA = os.path.join(DOCS, 'data')
os.makedirs(DOCS_DATA, exist_ok=True)

def load(p):
    with open(p, encoding='utf-8') as f: return json.load(f)

def clean(s):
    return re.sub(r'\s+', ' ', s).strip()

def strip_letter(opt):
    # options come as "א. text" / "ג . text" – strip the Hebrew letter prefix
    return clean(re.sub(r'^\s*[אבגד]\s*(?:[\.\)]\s*|\s+)', '', opt))

def strip_num(q):
    return clean(re.sub(r'^\s*\d+\s*[\.\)]\s*\.?\s*', '', q))

questions = []
# --- Google Forms quizzes ---
for course, ans_file, meta_file in [(1, 'form1_answers.json', 'form1_meta.json'), (2, 'form2_answers.json', 'form2_meta.json')]:
    ap = os.path.join(RAW, ans_file); mp = os.path.join(DATA, meta_file)
    if not os.path.exists(ap):
        print('skip', ans_file); continue
    meta = load(mp) if os.path.exists(mp) else {}
    for q in load(ap):
        m = meta.get(str(q['n']), {})
        questions.append({
            'id': f'c{course}-{q["n"]:02d}', 'source': f'course{course}', 'course': course, 'n': q['n'],
            'topic': m.get('topic', 'כללי'), 'q': strip_num(q['q']),
            'options': [strip_letter(o) for o in q['options']], 'correct': q['correct'],
            'why': m.get('why', ''), 'verified': True,
        })
# --- PDF-derived ---
for i, q in enumerate(load(os.path.join(DATA, 'pdf_questions.json')), 1):
    questions.append({'id': f'pdf-{i:02d}', 'source': 'pdf', 'course': 0, 'n': i, 'topic': q['topic'],
                      'q': q['q'], 'options': q['options'], 'correct': q['correct'], 'why': q.get('why', ''),
                      'page': q.get('page'), 'verified': True})

QIMG = load(os.path.join(DATA, 'question_images.json')) if os.path.exists(os.path.join(DATA, 'question_images.json')) else {}
for q in questions:
    if q['id'] in QIMG: q['img'] = QIMG[q['id']]
# sanity
for q in questions:
    assert 0 <= q['correct'] < len(q['options']), q['id']
    assert len(q['options']) >= 2, q['id']
ids = [q['id'] for q in questions]; assert len(ids) == len(set(ids))

lessons = load(os.path.join(DATA, 'lessons.json'))
topics = sorted({q['topic'] for q in questions})
howto = load(os.path.join(DATA, 'howto.json')) if os.path.exists(os.path.join(DATA, 'howto.json')) else {}

bundle = {'version': 9, 'questions': questions, 'lessons': lessons, 'topics': topics, 'howto': howto,
          'counts': {'course1': sum(q['course'] == 1 for q in questions), 'course2': sum(q['course'] == 2 for q in questions),
                     'pdf': sum(q['source'] == 'pdf' for q in questions), 'total': len(questions)}}
with open(os.path.join(DOCS_DATA, 'bundle.json'), 'w', encoding='utf-8') as f:
    json.dump(bundle, f, ensure_ascii=False, indent=0)
print('bundle:', bundle['counts'], 'topics:', len(topics), 'lessons:', len(lessons))

# --- copy Apps Script into docs so the app can show it ---
shutil = __import__('shutil'); shutil.copyfile(os.path.join(ROOT, 'tools', 'apps_script.gs'), os.path.join(DOCS, 'apps_script.gs'))

# --- single-file offline build ---
html = open(os.path.join(DOCS, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(DOCS, 'style.css'), encoding='utf-8').read()
js = open(os.path.join(DOCS, 'app.js'), encoding='utf-8').read()
pics = open(os.path.join(DOCS, 'pics.js'), encoding='utf-8').read()
syncjs = open(os.path.join(DOCS, 'sync.js'), encoding='utf-8').read()
gs = open(os.path.join(DOCS, 'apps_script.gs'), encoding='utf-8').read()
fontcss = open(os.path.join(DOCS, 'fonts', 'heebo.css'), encoding='utf-8').read()
def data_uri(path, mime):
    with open(path, 'rb') as f: return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())
fontcss = re.sub(r"url\((heebo-[^)]+)\)", lambda m: 'url(' + data_uri(os.path.join(DOCS, 'fonts', m.group(1)), 'font/woff2') + ')', fontcss)
imgs = {}
for p in sorted(glob.glob(os.path.join(DOCS, 'pdf', '*.jpg'))) + sorted(glob.glob(os.path.join(DOCS, 'img', '*.jpg'))):
    imgs[os.path.basename(p)] = data_uri(p, 'image/jpeg')
inline = html.replace('<link rel="stylesheet" href="fonts/heebo.css">', '<style>' + fontcss + '</style>')
inline = inline.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
inline = inline.replace('<script src="pics.js"></script>', '<script>' + pics.replace('</script>', '<\/script>') + '</script>')
inline = inline.replace('<script src="sync.js"></script>', '<script>' + syncjs.replace('</script>', '<\/script>') + '</script>')
inline = inline.replace('<script src="app.js"></script>',
    '<script>window.__BUNDLE__=' + json.dumps(bundle, ensure_ascii=False) + ';window.__IMAGES__=' + json.dumps(imgs) + ';window.__APPS_SCRIPT__=' + json.dumps(gs) + ';</script>'
    '<script>' + js.replace('</script>', '<\/script>') + '</script>')
inline = re.sub(r'<link rel="manifest"[^>]*>', '', inline)
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
out = os.path.join(ROOT, 'dist', 'boat-license-offline.html')
with open(out, 'w', encoding='utf-8') as f: f.write(inline)
print('offline file:', out, round(os.path.getsize(out) / 1e6, 2), 'MB')
