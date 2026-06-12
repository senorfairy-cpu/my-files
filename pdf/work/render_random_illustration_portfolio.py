from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, JpegImagePlugin


ROOT = Path(r"D:\Desktop\Codex\2026-06-09\pdf")
ASSET_DIR = ROOT / "work" / "random_illustration_portfolio_assets"
OUT_DIR = ROOT / "outputs"
OUT_DIR.mkdir(exist_ok=True)

cover_path = ASSET_DIR / "generated-cover.png"
sheet_path = ASSET_DIR / "generated-cases-sheet.png"
pdf_path = OUT_DIR / "random-illustration-portfolio-2026.pdf"
preview_path = OUT_DIR / "random-illustration-portfolio-2026-preview.png"

font_candidates = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    r"C:\Windows\Fonts\simsun.ttc",
]
font_path = next(Path(p) for p in font_candidates if Path(p).exists())


def font(size):
    return ImageFont.truetype(str(font_path), size)


W, H = 1240, 1754
BG = (247, 244, 237)
INK = (35, 35, 32)
MUTED = (104, 104, 95)
ACCENT = (26, 96, 116)
CORAL = (192, 81, 71)
GREEN = (81, 125, 83)

cases = [
    {
        "title": "雨夜咖啡馆",
        "type": "Editorial / 城市情绪",
        "desc": "为一篇关于夜间独处与城市温度的散文设定。画面用雨水反光、霓虹色块和室内暖光建立叙事焦点。",
        "palette": ["#1b4965", "#62b6cb", "#f4a261", "#e76f51"],
    },
    {
        "title": "温室日记",
        "type": "Lifestyle / 植物空间",
        "desc": "随机设定为园艺品牌季度视觉。重点是叶影、玻璃折射与静物层次，让商业画面仍保留手绘呼吸感。",
        "palette": ["#31572c", "#90a955", "#ecf39e", "#f2cc8f"],
    },
    {
        "title": "旅人肖像",
        "type": "Character / 人物概念",
        "desc": "以旅行手账作者为虚构角色，强调服装剪影、随身物件和目光方向，适合书封或人物栏目配图。",
        "palette": ["#2d3142", "#bfc0c0", "#ef8354", "#4f5d75"],
    },
    {
        "title": "屋顶月光花园",
        "type": "Children Book / 童书场景",
        "desc": "为不存在的童书章节绘制的梦境场景。柔和月光和夸张植物比例，让空间带有童话式可探索感。",
        "palette": ["#463f78", "#8a6fdf", "#f7d488", "#7cb518"],
    },
    {
        "title": "河岸黄昏市集",
        "type": "Poster / 文化活动",
        "desc": "假想为地方周末市集海报主视觉。用摊位节奏、人物动线和水面色彩把黄昏氛围推到第一层。",
        "palette": ["#264653", "#2a9d8f", "#e9c46a", "#e76f51"],
    },
]


def fit_image(img, box, mode="cover"):
    bw, bh = box
    scale = max(bw / img.width, bh / img.height) if mode == "cover" else min(bw / img.width, bh / img.height)
    resized = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - bw) // 2
    top = (resized.height - bh) // 2
    return resized.crop((left, top, left + bw, top + bh))


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def paste_round(page, img, xy, size, radius=18):
    page.paste(fit_image(img, size), xy, rounded_mask(size, radius))


def draw_wrapped(draw, text, xy, fnt, fill, max_width, line_gap=8):
    x, y = xy
    line = ""
    for ch in text:
        test = line + ch
        if draw.textlength(test, font=fnt) <= max_width:
            line = test
        else:
            draw.text((x, y), line, font=fnt, fill=fill)
            y += fnt.size + line_gap
            line = ch
    if line:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += fnt.size + line_gap
    return y


def add_footer(draw, page_no):
    draw.line((86, H - 94, W - 86, H - 94), fill=(218, 213, 202), width=2)
    draw.text((86, H - 72), "LIN YUE ILLUSTRATION PORTFOLIO / RANDOM CASE STUDIES", font=font(20), fill=MUTED)
    pn = f"{page_no:02d}"
    draw.text((W - 86 - draw.textlength(pn, font=font(20)), H - 72), pn, font=font(20), fill=MUTED)


sheet = Image.open(sheet_path).convert("RGB")
boxes = [
    (0, 0, 768, 512),
    (768, 0, 1536, 512),
    (0, 512, 512, 1024),
    (512, 512, 1024, 1024),
    (1024, 512, 1536, 1024),
]
panel_paths = []
for i, box in enumerate(boxes, 1):
    crop = sheet.crop(box)
    crop = crop.crop((12, 12, crop.width - 12, crop.height - 12))
    p = ASSET_DIR / f"case-{i}.png"
    crop.save(p, quality=95)
    panel_paths.append(p)

pages = []
cover_img = Image.open(cover_path).convert("RGB")
case_imgs = [Image.open(p).convert("RGB") for p in panel_paths]

page = Image.new("RGB", (W, H), BG)
paste_round(page, cover_img, (84, 88), (1072, 1220), 24)
d = ImageDraw.Draw(page)
d.rectangle((84, 1260, 1156, 1588), fill=BG)
d.text((94, 1304), "LIN YUE", font=font(70), fill=INK)
d.text((96, 1392), "插画作品集", font=font(62), fill=ACCENT)
d.text((98, 1474), "Random Illustration Case Studies / 2026", font=font(30), fill=MUTED)
d.rounded_rectangle((94, 1532, 360, 1588), radius=12, fill=CORAL)
d.text((124, 1546), "5 个随机案例", font=font(26), fill=(255, 255, 250))
add_footer(d, 1)
pages.append(page)

page = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(page)
d.text((86, 100), "作品集概览", font=font(58), fill=INK)
y = 196
y = draw_wrapped(
    d,
    "这是一份随机生成的虚构插画作品集，围绕“温暖、叙事、手绘质感”展开。五个案例覆盖城市编辑、生活方式、人物、童书和文化海报方向，适合展示风格延展与商业应用想象。",
    (86, y),
    font(30),
    MUTED,
    1030,
    12,
)
paste_round(page, sheet, (86, 390), (1068, 712), 18)
y = 1160
for i, c in enumerate(cases, 1):
    yy = y + (i - 1) * 76
    d.ellipse((92, yy + 4, 130, yy + 42), fill=[ACCENT, GREEN, CORAL, (125, 88, 158), (209, 137, 50)][i - 1])
    d.text((104, yy + 8), str(i), font=font(22), fill=(255, 255, 250))
    d.text((154, yy), c["title"], font=font(30), fill=INK)
    d.text((154, yy + 36), c["type"], font=font(21), fill=MUTED)
add_footer(d, 2)
pages.append(page)

for idx, (img, c) in enumerate(zip(case_imgs, cases), 3):
    page = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(page)
    paste_round(page, img, (86, 90), (1068, 900), 20)
    d.text((86, 1056), f"CASE {idx - 2:02d}", font=font(26), fill=ACCENT)
    d.text((86, 1104), c["title"], font=font(56), fill=INK)
    d.text((88, 1182), c["type"], font=font(27), fill=MUTED)
    draw_wrapped(d, c["desc"], (88, 1250), font(30), INK, 760, 12)
    d.text((88, 1464), "色彩方向", font=font(24), fill=MUTED)
    x = 88
    for hexcol in c["palette"]:
        rgb = tuple(int(hexcol[i : i + 2], 16) for i in (1, 3, 5))
        d.rounded_rectangle((x, 1510, x + 82, 1586), radius=10, fill=rgb)
        x += 100
    add_footer(d, idx)
    pages.append(page)

page = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(page)
d.text((86, 132), "联系方式", font=font(58), fill=INK)
d.text((88, 232), "Lin Yue / Fictional Illustrator", font=font(34), fill=ACCENT)
y = 330
y = draw_wrapped(d, "服务方向：出版插画、品牌视觉、文化活动海报、人物概念与童书场景。", (88, y), font(32), INK, 980, 14)
y += 36
draw_wrapped(d, "Email: hello@linyue-studio.example   Website: linyue-illustration.example", (88, y), font(26), MUTED, 1000, 10)
paste_round(page, cover_img, (650, 690), (430, 610), 22)
for i, img in enumerate(case_imgs[:3]):
    paste_round(page, img, (110 + i * 168, 760 + i * 72), (220, 160), 12)
d.text((88, 1450), "谢谢观看", font=font(68), fill=CORAL)
d.text((92, 1532), "Randomly composed by Codex, 2026", font=font(26), fill=MUTED)
add_footer(d, len(pages) + 1)
pages.append(page)

pages[0].save(preview_path, quality=92)
pages[0].save(pdf_path, save_all=True, append_images=pages[1:], resolution=150.0, quality=88)

print(pdf_path)
print(preview_path)
print("pages", len(pages))
