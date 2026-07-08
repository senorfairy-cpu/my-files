from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "portfolio.json"


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    if data.get("articles"):
        print(len(data["articles"]))
        return

    gallery = data.get("gallery", [])

    def cover(chapter: str) -> str:
        return next((asset["src"] for asset in gallery if asset.get("chapter") == chapter), "")

    data["articles"] = [
        {
            "id": "article-product-visual-system",
            "title": "从产品卖点到商业视觉：科技产品 KV 的组织方式",
            "date": "2026-07-07",
            "category": "Product Visual",
            "excerpt": "记录如何把硬件功能、应用场景和营销语言整理成可传播的产品主视觉。",
            "content": "科技产品视觉不能只停留在“好看”。更重要的是把用户能理解的卖点组织出来：核心功能是什么，使用场景在哪里，为什么值得相信。\n\n我的做法通常是先拆产品功能，再找最有商业价值的场景，最后把图像、标题、功能 icon 和局部说明压缩成一个清晰的信息层级。",
            "cover": cover("product-marketing"),
            "published": True,
        },
        {
            "id": "article-brand-to-touchpoints",
            "title": "品牌系统如何落到产品、展会和物料",
            "date": "2026-07-05",
            "category": "Brand System",
            "excerpt": "品牌不是一张 logo 图，而是一套能在产品、包装、展台和画册里连续出现的识别系统。",
            "content": "品牌系统的难点在于落地一致性。Logo、颜色、字体和图形语言需要进入产品铭牌、包装、展会画面、宣传册和网页界面。\n\n当这些触点都能被同一套视觉规则连接起来时，品牌才会形成稳定的专业感。",
            "cover": cover("brand-system"),
            "published": True,
        },
        {
            "id": "article-ai-workflow",
            "title": "AI 辅助创意在设计流程中的位置",
            "date": "2026-07-03",
            "category": "Workflow",
            "excerpt": "AI 更适合放在概念探索和场景草图阶段，最终质量仍取决于设计判断和后期整合。",
            "content": "AI 可以快速生成方向，但不能替代设计判断。更有效的流程是 Idea → AI Sketch → Scene Building → PS Retouch → Marketing Final。\n\n在这个流程里，AI 负责拓宽可能性，设计师负责筛选、重构、统一风格并把画面做成可交付的商业视觉。",
            "cover": cover("ai-workflow"),
            "published": True,
        },
    ]
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(len(data["articles"]))


if __name__ == "__main__":
    main()
