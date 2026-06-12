from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
src_root = root / "work" / "festival_assets"
out_root = root / "work" / "portfolio_assets"
out_root.mkdir(parents=True, exist_ok=True)

files = sorted(
    [p for p in src_root.rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png"}],
    key=lambda p: str(p),
)

processed = []
for idx, path in enumerate(files, 1):
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
        out = out_root / f"festival_{idx:02d}.jpg"
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
        label = f"{i+1:02d} {size[0]}x{size[1]}"
        draw.text(((i % cols) * thumb_w + 10, y + thumb_h - 4), label, fill=(20, 20, 20))

sheet.save(out_root / "festival_contact_sheet.jpg", "JPEG", quality=90)

for out, name, size in processed:
    print(f"{out.name}\t{size[0]}x{size[1]}\t{name}")
