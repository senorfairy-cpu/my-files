from __future__ import annotations

import json
import re
import shutil
import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = Path("D:/Desktop/作品整理.zip")
PUBLIC = ROOT / "public"
GALLERY_DIR = PUBLIC / "assets" / "gallery"
DATA_FILE = ROOT / "data" / "portfolio.json"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".tif", ".tiff"}
MAX_ASSETS = 720
MIN_SIDE = 180
MAX_BYTES = 55_000_000


CHAPTERS = [
    {
        "id": "brand-system",
        "index": "01",
        "title": "品牌系统设计",
        "subtitle": "Brand System Design",
        "ratio": "20%",
        "summary": "Logo, visual language, product identification, packaging, nameplates and brand application systems.",
        "keywords": ["OEM衍生/GEONAV", "OEM衍生/XMAP", "OEM衍生/GROUPE", "OEM衍生/RUDRA", "OEM衍生/斯里兰卡Global GIS", "OEM衍生/沙特门店"],
    },
    {
        "id": "product-marketing",
        "index": "02",
        "title": "产品营销视觉",
        "subtitle": "Product Marketing Visual",
        "ratio": "40%",
        "summary": "Core product KV, feature icons, functional breakdown pages and commercial scenes for GNSS/RTK products.",
        "keywords": ["Poster/RTK", "Poster/P8", "Poster/T20Pro", "Poster/Pbox", "Poster/NET660i", "Poster/family", "OEM衍生/GEONAV"],
    },
    {
        "id": "campaign-kv",
        "index": "03",
        "title": "商业海报 & KV",
        "subtitle": "Campaign KV",
        "ratio": "10%",
        "summary": "International campaign posters, launch visuals, product themes and multilingual market adaptations.",
        "keywords": ["Poster/俄语", "Poster/西语", "Poster/法语", "Poster/阿语", "Poster/农机", "Poster/机器人", "Poster/节日", "Poster/2025春节"],
    },
    {
        "id": "scene-3d",
        "index": "04",
        "title": "产品场景与3D视觉",
        "subtitle": "3D & Scenario Visual",
        "ratio": "20%",
        "summary": "C4D rendering, product scene building, engineering scenarios, material studies and motion-oriented visual exploration.",
        "keywords": ["渲染", "展台设计", "小动画", "大广赛", "毕设"],
    },
    {
        "id": "touchpoints",
        "index": "05",
        "title": "展会 / 画册 / 落地物料",
        "subtitle": "Exhibition & Collateral",
        "ratio": "10%",
        "summary": "Brochures, booth visuals, roll-up banners, print collateral, packaging, cards, warranty cards and peripheral brand materials.",
        "keywords": ["Periphery", "PPT", "平面", "展台设计", "OEM衍生/沙特门店"],
    },
    {
        "id": "ai-workflow",
        "index": "06",
        "title": "AI + 工作流",
        "subtitle": "AI Assisted Workflow",
        "ratio": "Process",
        "summary": "Idea, AI sketch, scene building, retouching and final marketing visual delivery as a repeatable workflow.",
        "keywords": ["渲染", "Poster", "平面"],
    },
    {
        "id": "practice",
        "index": "07",
        "title": "个人练习",
        "subtitle": "Practice Collection",
        "ratio": "Archive",
        "summary": "Graphic studies and self-initiated visual practice from layout, rendering and motion folders.",
        "keywords": ["平面", "小动画", "渲染"],
    },
]


def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return text[:64] or "asset"


def chapter_for(path: str) -> str:
    normalized = path.replace("\\", "/")
    scores: list[tuple[int, str]] = []
    for chapter in CHAPTERS:
        score = sum(1 for key in chapter["keywords"] if key in normalized)
        if score:
            scores.append((score, chapter["id"]))
    if scores:
        return sorted(scores, reverse=True)[0][1]
    if "/UI/" in normalized:
        return "product-marketing"
    if "/Poster/" in normalized:
        return "campaign-kv"
    if "/OEM衍生/" in normalized:
        return "brand-system"
    if "/Periphery/" in normalized or "/PPT/" in normalized:
        return "touchpoints"
    if "/渲染/" in normalized or "/展台设计/" in normalized:
        return "scene-3d"
    if "/平面/" in normalized:
        return "practice"
    return "practice"


def quality_score(info: zipfile.ZipInfo) -> tuple[int, int, int]:
    name = info.filename.lower()
    bad = any(token in name for token in ["tex/", "_nrm", "_disp", "_gloss", "_rough", ".hdr", ".exr", "base_disable"])
    good = any(token in name for token in ["poster", "海报", "banner", "画板", "展会", "p8", "t20", "rtk", "kv", "产品", "渲染"])
    return (0 if bad else 1, 1 if good else 0, min(info.file_size, 12_000_000))


def save_image(raw: bytes, dest: Path, max_side: int = 1280) -> dict | None:
    try:
        with Image.open(BytesIO(raw)) as image:
            image.seek(0)
            image = ImageOps.exif_transpose(image)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")
            if min(image.width, image.height) < MIN_SIDE:
                return None
            image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            dest.parent.mkdir(parents=True, exist_ok=True)
            final = dest.with_suffix(".jpg")
            if image.mode == "RGBA":
                bg = Image.new("RGB", image.size, (8, 8, 7))
                bg.paste(image, mask=image.getchannel("A"))
                image = bg
            image.save(final, "JPEG", quality=80, optimize=True, progressive=True)
            return {
                "src": "/" + final.relative_to(PUBLIC).as_posix(),
                "width": image.width,
                "height": image.height,
            }
    except Exception:
        return None


def main() -> None:
    if GALLERY_DIR.exists():
        shutil.rmtree(GALLERY_DIR)
    GALLERY_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(ZIP_PATH) as archive:
        infos = [
            info for info in archive.infolist()
            if not info.filename.endswith("/")
            and Path(info.filename).suffix.lower() in IMAGE_EXTS
            and info.file_size <= MAX_BYTES
        ]
        infos = sorted(infos, key=quality_score, reverse=True)
        assets = []
        for info in infos:
            if len(assets) >= MAX_ASSETS:
                break
            raw = archive.read(info)
            chapter_id = chapter_for(info.filename)
            dest = GALLERY_DIR / chapter_id / f"{len(assets) + 1:04d}-{slugify(Path(info.filename).stem)}"
            meta = save_image(raw, dest)
            if not meta:
                continue
            meta.update({
                "id": f"asset-{len(assets) + 1:04d}",
                "chapter": chapter_id,
                "source": info.filename,
                "title": Path(info.filename).stem,
                "orientation": "portrait" if meta["height"] > meta["width"] * 1.12 else "landscape" if meta["width"] > meta["height"] * 1.12 else "square",
            })
            assets.append(meta)

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    data["profile"].update({
        "name": "Graphic Designer Portfolio",
        "title": "Brand & Product Visual Designer",
        "intro": "Brand × Product × Marketing Visual. A technology-product portfolio covering brand systems, product marketing visuals, campaign KV, 3D scenes, collateral and AI-assisted workflow.",
    })
    data["chapters"] = CHAPTERS
    data["gallery"] = assets
    data["stats"] = [
        {"label": "Portfolio Chapters", "value": str(len(CHAPTERS))},
        {"label": "Gallery Images", "value": str(len(assets))},
        {"label": "Core Focus", "value": "Brand × Product × Marketing"},
    ]
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"gallery assets: {len(assets)}")
    print(DATA_FILE)


if __name__ == "__main__":
    main()
