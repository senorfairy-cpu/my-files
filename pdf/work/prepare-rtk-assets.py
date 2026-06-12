from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parent.parent
out_root = root / "work" / "portfolio_assets"
out_root.mkdir(parents=True, exist_ok=True)

sources = [
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\social Posters-0523.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\social Posters-0602.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\social Posters-0602-fr.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\social Posters-0602阿语.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T10pro social Posters-0524.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T10pro social Posters-0524-fr.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T10pro social Posters-0530阿拉伯语.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T20 social Posters-0524.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T20 social Posters-0529阿拉伯语.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T20Pro social Posters-0523.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T20pro social Posters-0524-fr.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T20pro social Posters-0529西语.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T20pro social Posters-0529阿拉伯语.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T5Lite social Posters-0524.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\T5Lite social Posters-0530阿拉伯语.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\toknav products poster—T10plus.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\toknav products poster—T10pro.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\toknav products poster—T20.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\toknav products poster—T20pro.jpg",
    r"F:\Social media-1\Poster\RTK\0519 4：5 RTK\toknav products posters-T5 lite.jpg",
]

processed = []
for idx, source in enumerate(sources, 1):
    path = Path(source)
    if not path.exists():
        continue
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((1900, 1900), Image.Resampling.LANCZOS)
        out = out_root / f"rtk_{idx:02d}.jpg"
        im.save(out, "JPEG", quality=88, optimize=True)
        processed.append((out, path.name, im.size))

thumb_w, thumb_h = 260, 260
cols = 5
rows = (len(processed) + cols - 1) // cols
sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + 42)), "white")
draw = ImageDraw.Draw(sheet)
for i, (out, name, size) in enumerate(processed):
    with Image.open(out) as im:
        thumb = ImageOps.contain(im, (thumb_w - 20, thumb_h - 20), Image.Resampling.LANCZOS)
        x = (i % cols) * thumb_w + (thumb_w - thumb.width) // 2
        y = (i // cols) * (thumb_h + 42) + 10
        sheet.paste(thumb, (x, y))
        draw.text(((i % cols) * thumb_w + 10, y + thumb_h - 4), f"{i+1:02d} {size[0]}x{size[1]}", fill=(20, 20, 20))
sheet.save(out_root / "rtk_contact_sheet.jpg", "JPEG", quality=90)

for out, name, size in processed:
    print(f"{out.name}\t{size[0]}x{size[1]}\t{name}")
