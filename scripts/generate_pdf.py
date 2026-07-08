from __future__ import annotations

import json
import math
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.pdfmetrics import registerFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
DATA_FILE = ROOT / "data" / "portfolio.json"
OUT = PUBLIC / "Designer-Portfolio.pdf"

registerFont(UnicodeCIDFont("STSong-Light"))

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 11 * mm
LEFT_W = 70 * mm
RIGHT_W = PAGE_W - MARGIN * 2 - LEFT_W - 8 * mm


def asset_path(src: str) -> Path:
    return PUBLIC / src.lstrip("/")


def fit_image(src: str, width: float, height: float) -> Image | str:
    path = asset_path(src)
    if not path.exists():
        return ""
    img = Image(str(path))
    ratio = min(width / img.imageWidth, height / img.imageHeight)
    img.drawWidth = img.imageWidth * ratio
    img.drawHeight = img.imageHeight * ratio
    return img


def bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#080807"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#2a2722"))
    canvas.line(MARGIN, PAGE_H - 9 * mm, PAGE_W - MARGIN, PAGE_H - 9 * mm)
    canvas.line(MARGIN, 9 * mm, PAGE_W - MARGIN, 9 * mm)
    canvas.setFillColor(colors.HexColor("#a9a39a"))
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, 5.8 * mm, "Graphic Designer Portfolio")
    canvas.drawCentredString(PAGE_W / 2, 5.8 * mm, "Brand × Product × Marketing Visual")
    canvas.drawRightString(PAGE_W - MARGIN, 5.8 * mm, str(doc.page))
    canvas.restoreState()


def style_map():
    return {
        "eyebrow": ParagraphStyle("eyebrow", fontName="STSong-Light", fontSize=7.2, leading=9, textColor=colors.HexColor("#bd8c55"), spaceAfter=5),
        "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=24, leading=26, textColor=colors.HexColor("#f4efe6"), spaceAfter=8),
        "h2": ParagraphStyle("h2", fontName="STSong-Light", fontSize=20, leading=24, textColor=colors.HexColor("#f4efe6"), spaceAfter=8),
        "h3": ParagraphStyle("h3", fontName="STSong-Light", fontSize=14, leading=17, textColor=colors.HexColor("#f4efe6"), spaceAfter=6),
        "body": ParagraphStyle("body", fontName="STSong-Light", fontSize=8.4, leading=12.2, textColor=colors.HexColor("#d0c8bd")),
        "small": ParagraphStyle("small", fontName="STSong-Light", fontSize=6.7, leading=8.5, textColor=colors.HexColor("#a9a39a")),
    }


def gallery_for(data, chapter_id):
    return [asset for asset in data.get("gallery", []) if asset.get("chapter") == chapter_id]


def left_panel(chapter, count, page_no, st):
    return [
        Paragraph(f"CHAPTER {chapter['index']}", st["eyebrow"]),
        Paragraph(chapter["title"], st["h2"]),
        Paragraph(chapter["subtitle"], st["small"]),
        Spacer(1, 5 * mm),
        Paragraph(chapter["summary"], st["body"]),
        Spacer(1, 6 * mm),
        Paragraph(f"Recommended Ratio: {chapter['ratio']}", st["small"]),
        Paragraph(f"Images in Chapter: {count}", st["small"]),
        Paragraph(f"Sheet: {page_no}", st["small"]),
    ]


def image_sheet(assets):
    cols = 5
    rows = 3
    cell_w = RIGHT_W / cols
    cell_h = 48 * mm
    table_rows = []
    for r in range(rows):
        row = []
        for c in range(cols):
            idx = r * cols + c
            row.append(fit_image(assets[idx]["src"], cell_w - 3 * mm, cell_h - 7 * mm) if idx < len(assets) else "")
        table_rows.append(row)
    return Table(
        table_rows,
        colWidths=[cell_w] * cols,
        rowHeights=[cell_h] * rows,
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("LEFTPADDING", (0, 0), (-1, -1), 1.5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 1.5),
            ("TOPPADDING", (0, 0), (-1, -1), 1.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
            ("BOX", (0, 0), (-1, -1), .25, colors.HexColor("#211f1c")),
            ("INNERGRID", (0, 0), (-1, -1), .25, colors.HexColor("#211f1c")),
        ]),
    )


def spread(left, right):
    return Table(
        [[left, right]],
        colWidths=[LEFT_W, RIGHT_W],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (0, 0), 8 * mm),
            ("LEFTPADDING", (1, 0), (1, 0), 0),
            ("LINEBEFORE", (1, 0), (1, 0), .35, colors.HexColor("#2a2722")),
            ("LEFTPADDING", (1, 0), (1, 0), 6 * mm),
        ]),
    )


def main() -> None:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    st = style_map()
    profile = data["profile"]
    chapters = data.get("chapters", [])
    gallery = data.get("gallery", [])
    cover = next((a for a in gallery if a["chapter"] == "product-marketing" and a["orientation"] == "portrait"), gallery[0])

    story = [
        Spacer(1, 13 * mm),
        spread(
            [
                Paragraph("GRAPHIC DESIGNER PORTFOLIO", st["eyebrow"]),
                Paragraph("PORTFOLIO", st["h1"]),
                Paragraph(profile["title"], st["h3"]),
                Paragraph(profile["intro"], st["body"]),
                Spacer(1, 8 * mm),
                Paragraph("Structure: Cover / About / Brand System / Product Marketing Visual / Campaign KV / 3D Scenario Visual / Exhibition & Collateral / AI Workflow / Practice / Ending", st["small"]),
                Spacer(1, 5 * mm),
                Paragraph(f"Total gallery images used: {len(gallery)}", st["small"]),
            ],
            fit_image(cover["src"], RIGHT_W, 142 * mm),
        ),
        PageBreak(),
        Spacer(1, 12 * mm),
        spread(
            [
                Paragraph("ABOUT ME", st["eyebrow"]),
                Paragraph("科技产品商业视觉设计师", st["h2"]),
                Paragraph("能力标签：品牌系统｜产品营销视觉｜海报KV｜3D场景｜画册｜展会视觉｜AI辅助创意", st["body"]),
                Spacer(1, 5 * mm),
                Paragraph("软件能力：PS / AI / C4D / AE / ChatGPT", st["body"]),
            ],
            [
                Paragraph("Portfolio Ratio", st["h3"]),
                Paragraph("品牌系统：20%<br/>产品营销视觉：40%<br/>场景视觉：20%<br/>海报：10%<br/>落地物料：10%", st["body"]),
                Spacer(1, 10 * mm),
                Paragraph("Positioning", st["h3"]),
                Paragraph("比传统平面设计师更聚焦科技产品商业化：从品牌识别到产品卖点、场景图、展会和画册落地。", st["body"]),
            ],
        ),
        PageBreak(),
    ]

    for chapter in chapters:
        assets = gallery_for(data, chapter["id"])
        if not assets:
            continue
        pages = math.ceil(len(assets) / 15)
        for page_index in range(pages):
            batch = assets[page_index * 15 : (page_index + 1) * 15]
            story.append(Spacer(1, 9 * mm))
            story.append(spread(left_panel(chapter, len(assets), page_index + 1, st), image_sheet(batch)))
            story.append(PageBreak())

    story.extend([
        Spacer(1, 16 * mm),
        spread(
            [
                Paragraph("ENDING", st["eyebrow"]),
                Paragraph("Brand × Product × Marketing Visual", st["h1"]),
                Paragraph("Looking forward to working with you.", st["body"]),
                Spacer(1, 8 * mm),
                Paragraph(profile.get("email", "hello@example.com"), st["small"]),
                Paragraph(profile.get("location", "Chengdu, China"), st["small"]),
            ],
            [
                Paragraph("AI Assisted Workflow", st["h3"]),
                Paragraph("Idea → AI Sketch → Scene Building → PS Retouch → Marketing Final", st["body"]),
                Spacer(1, 12 * mm),
                Paragraph("Selected works from the full image archive are organized by chapter so the PDF can function as both a portfolio and a visual asset index.", st["body"]),
            ],
        ),
    ])

    doc = SimpleDocTemplate(str(OUT), pagesize=landscape(A4), rightMargin=MARGIN, leftMargin=MARGIN, topMargin=11 * mm, bottomMargin=11 * mm)
    doc.build(story, onFirstPage=bg, onLaterPages=bg)
    print(OUT)
    print(f"images used: {len(gallery)}")


if __name__ == "__main__":
    main()
