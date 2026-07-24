import json
import os
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "portfolio-landscape-modules.pdf"
DATA = ROOT / "data" / "portfolio.json"
LANG = ROOT / "public" / "language-content.json"
PUBLIC = ROOT / "public"


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def local_path(src):
    if not src:
        return None
    path = PUBLIC / src.lstrip("/")
    return path if path.exists() else None


def gallery_for(gallery, chapter_id):
    return [asset for asset in gallery if asset.get("chapter") == chapter_id and asset.get("hidden") is not True and asset.get("src")]


def cover_for(gallery, chapter_id):
    assets = gallery_for(gallery, chapter_id)
    selected = next((a for a in assets if a.get("showInChapterCover") is True), None)
    if selected:
        return selected
    landscape_asset = next((a for a in assets if a.get("orientation") == "landscape"), None)
    return landscape_asset or (assets[0] if assets else None)


def previews_for(gallery, chapter_id):
    assets = gallery_for(gallery, chapter_id)
    selected = [a for a in assets if a.get("showInChapterStrip") is True]
    return (selected or assets)[:4]


def image_fit(c, src, x, y, w, h, cover=False, alpha=1):
    path = local_path(src)
    if not path:
        return
    with Image.open(path) as img:
        iw, ih = img.size
    scale = max(w / iw, h / ih) if cover else min(w / iw, h / ih)
    nw, nh = iw * scale, ih * scale
    dx, dy = x + (w - nw) / 2, y + (h - nh) / 2
    c.saveState()
    c.rect(x, y, w, h, stroke=0, fill=0)
    c.clipPath(c.beginPath(), stroke=0, fill=0)
    if alpha < 1:
        c.setFillAlpha(alpha)
    c.drawImage(ImageReader(str(path)), dx, dy, nw, nh, mask="auto")
    c.restoreState()


def draw_grid(c, w, h):
    c.saveState()
    c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.08))
    c.setLineWidth(0.35)
    step = 54
    for x in range(0, int(w) + step, step):
        c.line(x, 0, x, h)
    for y in range(0, int(h) + step, step):
        c.line(0, y, w, y)
    c.restoreState()


def wrap_text(text, max_chars=30, max_lines=4):
    text = str(text or "")
    lines, line = [], ""
    for ch in text:
        line += ch
        units = sum(0.55 if ord(c) < 128 else 1 for c in line)
        if units >= max_chars:
            lines.append(line)
            line = ""
            if len(lines) >= max_lines:
                return lines
    if line and len(lines) < max_lines:
        lines.append(line)
    return lines


def draw_text_lines(c, text, x, y, size, color, max_chars, max_lines, leading):
    c.setFont("STSong-Light", size)
    c.setFillColor(color)
    for idx, line in enumerate(wrap_text(text, max_chars, max_lines)):
        c.drawString(x, y - idx * leading, line)


def main():
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    portfolio = load_json(DATA)
    lang = load_json(LANG).get("zh", {})
    chapters_by_id = lang.get("chaptersById", {})
    chapters = []
    for chapter in portfolio.get("chapters", [])[:6]:
        item = dict(chapter)
        item.update(chapters_by_id.get(chapter.get("id"), {}))
        chapters.append(item)
    gallery = portfolio.get("gallery", [])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    page_w, page_h = landscape(A4)
    c = canvas.Canvas(str(OUT), pagesize=(page_w, page_h))

    for index, chapter in enumerate(chapters, start=1):
        cover = cover_for(gallery, chapter.get("id"))
        previews = previews_for(gallery, chapter.get("id"))

        c.setFillColor(colors.HexColor("#050403"))
        c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
        if cover:
            image_fit(c, cover.get("src"), 0, 0, page_w, page_h, cover=True, alpha=0.76)
        c.setFillColor(colors.Color(0, 0, 0, alpha=0.66))
        c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
        c.setFillColor(colors.Color(0.55, 0.2, 0.04, alpha=0.3))
        c.circle(page_w * 0.82, page_h * 0.72, 230, stroke=0, fill=1)
        draw_grid(c, page_w, page_h)

        margin = 42
        c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.22))
        c.setLineWidth(0.6)
        c.rect(margin, margin, page_w - margin * 2, page_h - margin * 2, stroke=1, fill=0)

        c.setFont("STSong-Light", 10)
        c.setFillColor(colors.HexColor("#f06f32"))
        c.drawString(margin + 20, page_h - margin - 28, f"CHAPTER {str(index).zfill(2)} / PORTFOLIO MODULE")

        title = chapter.get("title") or chapter.get("subtitle") or "Portfolio Module"
        c.setFont("STSong-Light", 38)
        c.setFillColor(colors.HexColor("#fff4e8"))
        c.drawString(margin + 20, page_h - margin - 78, title)

        draw_text_lines(
            c,
            chapter.get("summary", ""),
            margin + 20,
            page_h - margin - 120,
            12,
            colors.Color(1, 0.92, 0.84, alpha=0.82),
            42,
            4,
            18,
        )

        card_w = 132
        card_h = 118
        start_x = page_w - margin - 20 - card_w * 2 - 12
        start_y = margin + 26 + card_h + 12
        for i, asset in enumerate(previews[:4]):
            x = start_x + (i % 2) * (card_w + 12)
            y = start_y - (i // 2) * (card_h + 12)
            c.setFillColor(colors.Color(1, 1, 1, alpha=0.06))
            c.rect(x, y, card_w, card_h, stroke=0, fill=1)
            c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.18))
            c.rect(x, y, card_w, card_h, stroke=1, fill=0)
            image_fit(c, asset.get("src"), x + 1, y + 1, card_w - 2, card_h - 2, cover=True, alpha=0.92)
            c.setFont("STSong-Light", 9)
            c.setFillColor(colors.HexColor("#f06f32"))
            c.drawString(x + 9, y + card_h - 16, str(i + 1).zfill(2))

        c.setFont("STSong-Light", 9)
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.6))
        c.drawRightString(page_w - margin - 20, margin + 16, f"[ {chapter.get('subtitle', '')} ]")
        c.showPage()

    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
