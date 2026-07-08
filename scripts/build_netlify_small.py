from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "portfolio-site"
OUT = ROOT / "portfolio-netlify-small"
PUBLIC = SITE / "public"


def copy_text(name: str) -> None:
    shutil.copy2(PUBLIC / name, OUT / name)


def resize_image(src: Path, dest: Path) -> tuple[int, int] | None:
    try:
        with Image.open(src) as image:
            image = image.convert("RGB")
            image.thumbnail((720, 720), Image.Resampling.LANCZOS)
            dest.parent.mkdir(parents=True, exist_ok=True)
            image.save(dest, "JPEG", quality=62, optimize=True, progressive=True)
            return image.width, image.height
    except Exception:
        return None


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    (OUT / "data").mkdir()

    for name in ["index.html", "app.js", "styles.css"]:
        copy_text(name)

    html = (OUT / "index.html").read_text(encoding="utf-8")
    html = html.replace('<a href="/admin.html">后台</a>', "")
    html = html.replace('<a class="nav-cta" href="/Designer-Portfolio.pdf">PDF</a>', "")
    (OUT / "index.html").write_text(html, encoding="utf-8")

    app = (OUT / "app.js").read_text(encoding="utf-8")
    app = app.replace('fetch("/api/portfolio").catch(() => fetch("/data/portfolio.json"))', 'fetch("/data/portfolio.json")')
    (OUT / "app.js").write_text(app, encoding="utf-8")

    data = json.loads((SITE / "data" / "portfolio.json").read_text(encoding="utf-8"))
    keep_gallery = []
    for asset in data.get("gallery", []):
        src = PUBLIC / asset["src"].lstrip("/")
        dest = OUT / "assets" / "gallery-small" / asset["chapter"] / Path(asset["src"]).name
        size = resize_image(src, dest)
        if not size:
            continue
        item = dict(asset)
        item["src"] = "/" + dest.relative_to(OUT).as_posix()
        item["width"], item["height"] = size
        keep_gallery.append(item)
    data["gallery"] = keep_gallery
    data["stats"] = [
        {"label": "Portfolio Chapters", "value": str(len(data.get("chapters", [])))},
        {"label": "Preview Images", "value": str(len(keep_gallery))},
        {"label": "Core Focus", "value": "Brand × Product × Marketing"},
    ]
    (OUT / "data" / "portfolio.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(OUT)
    print("images", len(keep_gallery))


if __name__ == "__main__":
    main()
