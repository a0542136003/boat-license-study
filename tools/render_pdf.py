"""Render the scanned course PDF to upright JPEGs for the app (docs/pdf) and larger PNGs for transcription."""
import fitz, os, sys
SRC = r"C:\Users\YoelBenNesher\Downloads\boat_course_somelessons-rotated.pdf"
OUT_WEB = os.path.join(os.path.dirname(__file__), '..', 'docs', 'pdf')
OUT_BIG = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'data', 'raw', 'pages')
os.makedirs(OUT_WEB, exist_ok=True); os.makedirs(OUT_BIG, exist_ok=True)
doc = fitz.open(SRC)
for i, p in enumerate(doc):
    # page.rotation already 180 for 1-14; get_pixmap applies /Rotate so output is upright as intended
    pix = p.get_pixmap(dpi=110)
    pix.save(os.path.join(OUT_BIG, f'p{i+1:02d}.png'))
    web = p.get_pixmap(dpi=72)
    web.pil_save(os.path.join(OUT_WEB, f'p{i+1:02d}.jpg'), quality=72) if hasattr(web,'pil_save') else web.save(os.path.join(OUT_WEB, f'p{i+1:02d}.png'))
    print(i+1, pix.width, pix.height)
