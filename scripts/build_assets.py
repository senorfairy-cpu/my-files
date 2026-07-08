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
ASSET_DIR = PUBLIC / "assets" / "generated"
DATA_DIR = ROOT / "data"
DATA_FILE = DATA_DIR / "portfolio.json"


PROJECTS = [
    {
        "id": "geonav",
        "title": "GEONAV OEM Visual System",
        "category": "OEM Branding",
        "year": "2024",
        "role": "Brand adaptation, product key visual, label system",
        "summary": "GNSS receiver brand adaptation covering product posters, labels, icon assets and client-facing brochure visuals.",
        "tags": ["OEM", "GNSS", "Brand system", "Print"],
        "prefixes": ["作品整理/OEM衍生/GEONAV/"],
    },
    {
        "id": "xmap",
        "title": "XMAP / XFIELD Interface Assets",
        "category": "UI Design",
        "year": "2024",
        "role": "Icon system, app interface assets",
        "summary": "A field-surveying software asset suite with menu states, functional icons and product interface visual language.",
        "tags": ["UI", "Icon", "Mobile", "Surveying"],
        "prefixes": ["作品整理/OEM衍生/XMAP/"],
    },
    {
        "id": "toknav-agri",
        "title": "Toknav Agriculture Software",
        "category": "Product UI",
        "year": "2024",
        "role": "Dashboard UI, software visual assets",
        "summary": "Agricultural navigation software screens and UI components designed for clear operational use in the field.",
        "tags": ["UI", "Agriculture", "Navigation", "Product"],
        "prefixes": ["作品整理/UI/Toknav农机系列软件/"],
    },
    {
        "id": "rtk-posters",
        "title": "RTK Global Campaign Posters",
        "category": "Marketing Poster",
        "year": "2023-2025",
        "role": "Poster series, multilingual campaign design",
        "summary": "A multilingual poster campaign for RTK products, balancing technical product visibility with social media readability.",
        "tags": ["Poster", "Campaign", "Multilingual", "RTK"],
        "prefixes": ["作品整理/Poster/RTK/"],
    },
    {
        "id": "groupe",
        "title": "GROUPE Senegal Brand Materials",
        "category": "Regional Branding",
        "year": "2024",
        "role": "Localized brand and poster adaptation",
        "summary": "Localized French-market brand visuals and poster materials for distributor communication in Senegal.",
        "tags": ["Branding", "French", "OEM", "Poster"],
        "prefixes": ["作品整理/OEM衍生/GROUPE 塞内加尔/"],
    },
    {
        "id": "rudra",
        "title": "RUDRA Exhibition Identity",
        "category": "Exhibition",
        "year": "2026",
        "role": "Booth key visual, exhibition mockup",
        "summary": "Exhibition-facing brand visuals and booth mockups that translate product identity into a physical display space.",
        "tags": ["Exhibition", "Booth", "Branding", "3D mockup"],
        "prefixes": ["作品整理/OEM衍生/RUDRA/"],
    },
    {
        "id": "global-gis",
        "title": "Global GIS Office Posters",
        "category": "Environmental Graphics",
        "year": "2024",
        "role": "Office poster set, spatial graphics",
        "summary": "Large-format office poster designs for a Sri Lanka partner, built around product trust and regional identity.",
        "tags": ["Spatial", "Poster", "OEM", "Large format"],
        "prefixes": ["作品整理/OEM衍生/斯里兰卡Global GIS/"],
    },
    {
        "id": "periphery",
        "title": "Peripheral Brand Collateral",
        "category": "Collateral",
        "year": "2023-2025",
        "role": "Business cards, warranty cards, tape and bag designs",
        "summary": "A collection of practical brand touchpoints, from cards and packaging details to everyday giveaway materials.",
        "tags": ["Collateral", "Packaging", "Print", "Merch"],
        "prefixes": ["作品整理/Periphery/名片/", "作品整理/Periphery/保修卡/", "作品整理/Periphery/纸胶带/", "作品整理/Periphery/帆布袋/"],
    },
    {
        "id": "rendering",
        "title": "Rendering & Motion Studies",
        "category": "3D / Motion",
        "year": "2022-2025",
        "role": "C4D rendering, product scenes, motion experiments",
        "summary": "Rendering and motion studies showing product, material and environmental exploration across still and animated work.",
        "tags": ["3D", "Rendering", "Motion", "C4D"],
        "prefixes": ["作品整理/渲染/", "作品整理/展台设计/"],
    },
    {
        "id": "flat-design",
        "title": "Graphic Design Collection",
        "category": "Graphic Design",
        "year": "2022-2025",
        "role": "Brochure, layout and poster collection",
        "summary": "A broader graphic design collection spanning brochure systems, campaign layouts and visual explorations.",
        "tags": ["Layout", "Graphic", "Brochure", "Poster"],
        "prefixes": ["作品整理/平面/", "作品整理/Poster/P8/", "作品整理/Poster/农机/", "作品整理/Poster/机器人/"],
    },
]


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or "asset"


def is_image(name: str) -> bool:
    return Path(name).suffix.lower() in {".jpg", ".jpeg", ".png"}


def score(info: zipfile.ZipInfo) -> tuple[int, int]:
    name = Path(info.filename).name.lower()
    bad = any(token in name for token in ["tex", "nrm", "disp", "gloss", "base_disable", "disable"])
    good = any(token in name for token in ["poster", "海报", "展会", "banner", "p8", "t20", "画板", "office"])
    size = info.file_size
    return (0 if bad else 1, 1 if good else 0, min(size, 8_000_000))


def save_web_image(raw: bytes, dest: Path, max_side: int = 1800) -> dict | None:
    try:
        with Image.open(BytesIO(raw)) as image:
            image = ImageOps.exif_transpose(image)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")
            image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            dest.parent.mkdir(parents=True, exist_ok=True)
            if image.mode == "RGBA":
                image.save(dest.with_suffix(".png"), optimize=True)
                final = dest.with_suffix(".png")
            else:
                image.save(dest.with_suffix(".jpg"), "JPEG", quality=86, optimize=True, progressive=True)
                final = dest.with_suffix(".jpg")
            return {"src": "/" + final.relative_to(PUBLIC).as_posix(), "width": image.width, "height": image.height}
    except Exception:
        return None


def main() -> None:
    if not ZIP_PATH.exists():
        raise SystemExit(f"Missing source zip: {ZIP_PATH}")

    if ASSET_DIR.exists():
        shutil.rmtree(ASSET_DIR)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(ZIP_PATH) as archive:
        infos = [i for i in archive.infolist() if not i.filename.endswith("/") and is_image(i.filename)]
        for project in PROJECTS:
            candidates = [i for i in infos if any(i.filename.startswith(prefix) for prefix in project["prefixes"])]
            candidates = sorted(candidates, key=score, reverse=True)
            assets = []
            for info in candidates:
                if len(assets) >= 6:
                    break
                if info.file_size > 35_000_000:
                    continue
                raw = archive.read(info)
                base = f"{project['id']}-{len(assets) + 1:02d}-{slugify(Path(info.filename).stem)}"
                meta = save_web_image(raw, ASSET_DIR / project["id"] / base)
                if meta and meta["width"] >= 220 and meta["height"] >= 160:
                    meta["alt"] = project["title"]
                    meta["source"] = info.filename
                    assets.append(meta)
            project["assets"] = assets
            project["cover"] = assets[0]["src"] if assets else ""

    payload = {
        "profile": {
            "name": "Designer Portfolio",
            "title": "Brand / UI / Visual Designer",
            "location": "Chengdu, China",
            "intro": "A focused collection of OEM branding, product UI, campaign posters, exhibition visuals, 3D rendering and print collateral.",
            "email": "hello@example.com",
            "phone": "",
        },
        "stats": [
            {"label": "Selected projects", "value": str(len(PROJECTS))},
            {"label": "Visual directions", "value": "6+"},
            {"label": "Markets covered", "value": "CN / EN / FR / ES / AR"},
        ],
        "projects": PROJECTS,
    }
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {DATA_FILE}")


if __name__ == "__main__":
    main()
