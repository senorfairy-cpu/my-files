let portfolio = null;
let languageContent = null;
let currentLang = localStorage.getItem("portfolioLanguage") || "zh";
if (!["zh", "en"].includes(currentLang)) currentLang = "zh";
let activeChapter = "all";
let revealObserver = null;

async function loadPortfolio() {
  const res = await fetch("/api/portfolio").catch(() => fetch("/data/portfolio.json"));
  portfolio = await res.json();
  const langRes = await fetch("/language-content.json").catch(() => null);
  languageContent = langRes?.ok ? await langRes.json() : null;
  render();
}

function langData() {
  return languageContent?.[currentLang] || {};
}

function t(path, fallback = "") {
  return path.split(".").reduce((value, key) => value?.[key], langData()) ?? fallback;
}

function localizedCollection(name) {
  return langData()[name] || {};
}

function localizedChapter(chapter) {
  return {
    ...chapter,
    ...(localizedCollection("chaptersById")[chapter.id] || {}),
  };
}

function localizedArticle(article) {
  return {
    ...article,
    ...(localizedCollection("articlesById")[article.id] || {}),
  };
}

function applyStaticText() {
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n, element.textContent);
  });
  document.getElementById("langToggle").textContent = t("language.toggle", currentLang === "zh" ? "EN" : "中文");
}

function visibleGallery() {
  return (portfolio.gallery || []).filter(asset => asset.hidden !== true);
}

function galleryFor(chapterId) {
  return visibleGallery().filter(asset => asset.chapter === chapterId);
}

function coverFor(chapterId) {
  const assets = galleryFor(chapterId);
  return assets.find(asset => asset.orientation === "landscape") || assets[0] || visibleGallery()[0];
}

function chapterById(id) {
  const chapter = (portfolio.chapters || []).find(item => item.id === id);
  return chapter ? localizedChapter(chapter) : null;
}

function sortedArticles() {
  return (portfolio.articles || [])
    .filter(article => article.published !== false)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function render() {
  applyStaticText();
  const profile = { ...portfolio.profile, ...(langData().profile || {}) };
  const chapters = (portfolio.chapters || []).map(localizedChapter);
  const gallery = visibleGallery();
  const heroAsset = coverFor("product-marketing") || gallery[0];

  document.title = `${profile.name} - Portfolio`;
  document.querySelector(".brand").textContent = profile.title;
  document.getElementById("profileName").textContent = profile.title;
  document.getElementById("profileIntro").textContent = profile.intro;
  document.getElementById("footerName").textContent = profile.email || profile.name;
  document.getElementById("endingContact").textContent = `${profile.email || "hello@example.com"} · ${profile.location || "Chengdu, China"}`;
  document.getElementById("heroCount").textContent = gallery.length;
  document.getElementById("aboutTitle").textContent = t("about.title", "科技产品商业视觉设计师");
  document.getElementById("aboutBody").textContent = t("about.body", "定位于品牌系统、产品营销视觉、海报 KV、3D 场景、画册、展会视觉与 AI 辅助创意工作流。");
  document.getElementById("chaptersTitle").textContent = t("chapters.title", "按照“品牌 × 产品 × 营销视觉”的求职叙事重组作品。");
  document.getElementById("thinkingTitle").textContent = t("thinking.title", "设计心得、项目复盘与方法沉淀。");
  document.getElementById("archiveTitle").textContent = t("archive.title", "素材库图片按章节分类形成可浏览图库。");
  document.getElementById("endingTitle").textContent = t("ending.title", "Brand × Product × Marketing Visual");
  document.getElementById("footerTagline").textContent = t("footer.tagline", "期待与你合作。");
  document.getElementById("footerLocation").textContent = profile.location || t("footer.location", "中国成都");
  document.getElementById("skillGrid").innerHTML = (t("about.skills", []) || []).map(skill => `<span>${escapeHtml(skill)}</span>`).join("");
  if (heroAsset) {
    document.getElementById("heroBg").style.backgroundImage = `linear-gradient(90deg, rgba(9,9,8,.96) 0%, rgba(9,9,8,.70) 42%, rgba(9,9,8,.35) 100%), url("${heroAsset.src}")`;
  }

  const localizedStats = langData().stats || portfolio.stats || [];
  document.getElementById("stats").innerHTML = localizedStats.map(item => `
    <div class="stat"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>
  `).join("");

  document.getElementById("chapterNav").innerHTML = chapters.map(chapter => `
    <a href="#${chapter.id}">
      <span>${escapeHtml(chapter.index)}</span>
      <strong>${escapeHtml(chapter.title)}</strong>
      <em>${escapeHtml(chapter.ratio)}</em>
    </a>
  `).join("");

  document.getElementById("chapterList").innerHTML = chapters.map(chapter => {
    const assets = galleryFor(chapter.id);
    const cover = coverFor(chapter.id);
    const preview = assets.slice(0, 18);
    return `
      <article class="chapter" id="${chapter.id}">
        <div class="chapter-copy">
          <p class="eyebrow">Chapter ${escapeHtml(chapter.index)} / ${escapeHtml(chapter.subtitle)}</p>
          <h3>${escapeHtml(chapter.title)}</h3>
          <p>${escapeHtml(chapter.summary)}</p>
          <div class="chapter-meta">
            <span>${escapeHtml(chapter.ratio)}</span>
            <span>${assets.length} ${escapeHtml(t("common.images", "张图片"))}</span>
          </div>
        </div>
        <div class="chapter-cover">
          ${cover ? `<img loading="lazy" src="${cover.src}" alt="${escapeHtml(chapter.title)}">` : ""}
        </div>
        <div class="chapter-strip">
          ${preview.map(asset => `<img loading="lazy" src="${asset.src}" alt="${escapeHtml(asset.title)}">`).join("")}
        </div>
      </article>
    `;
  }).join("");

  renderArticles();
  renderFilters();
  renderArchive();
  setupRevealAnimations();
}

function renderArticles() {
  const articles = sortedArticles().map(localizedArticle);
  document.getElementById("articleGrid").innerHTML = articles.length ? articles.map(article => `
    <button class="article-card" type="button" data-id="${article.id}">
      ${article.cover ? `<img src="${article.cover}" alt="${escapeHtml(article.title)}">` : ""}
      <span>${escapeHtml(article.date)} · ${escapeHtml(article.category || t("common.design", "Design"))}</span>
      <strong>${escapeHtml(article.title)}</strong>
      <p>${escapeHtml(article.excerpt)}</p>
    </button>
  `).join("") : `<p class="empty-note">${escapeHtml(t("thinking.empty", "暂无文章。可在后台新增设计心得。"))}</p>`;

  document.querySelectorAll(".article-card").forEach(card => {
    card.addEventListener("click", () => openArticle(card.dataset.id));
  });
}

function openArticle(id) {
  const original = (portfolio.articles || []).find(item => item.id === id);
  const article = original ? localizedArticle(original) : null;
  if (!article) return;
  document.getElementById("modalMeta").textContent = `${article.date || ""} · ${article.category || t("common.design", "Design")}`;
  document.getElementById("modalTitle").textContent = article.title || "";
  const cover = document.getElementById("modalCover");
  cover.hidden = !article.cover;
  cover.src = article.cover || "";
  document.getElementById("modalContent").innerHTML = String(article.content || "")
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
  document.getElementById("articleModal").hidden = false;
}

document.getElementById("closeArticle").addEventListener("click", () => {
  document.getElementById("articleModal").hidden = true;
});

function renderFilters() {
  const chapters = (portfolio.chapters || []).map(localizedChapter);
  const filters = [{ id: "all", title: t("filters.all", "全部") }, ...chapters.map(chapter => ({ id: chapter.id, title: chapter.title }))];
  document.getElementById("filters").innerHTML = filters.map(filter => `
    <button class="${filter.id === activeChapter ? "active" : ""}" data-id="${escapeHtml(filter.id)}">${escapeHtml(filter.title)}</button>
  `).join("");
  document.querySelectorAll("#filters button").forEach(button => {
    button.addEventListener("click", () => {
      activeChapter = button.dataset.id;
      renderArchive();
      setupRevealAnimations();
    });
  });
}

function renderArchive() {
  const assets = activeChapter === "all" ? visibleGallery() : galleryFor(activeChapter);
  document.querySelectorAll("#filters button").forEach(button => {
    button.classList.toggle("active", button.dataset.id === activeChapter);
  });
  document.getElementById("masonry").innerHTML = assets.map(asset => {
    const chapter = chapterById(asset.chapter);
    return `
      <figure class="archive-item">
        <img loading="lazy" src="${asset.src}" alt="${escapeHtml(asset.title)}">
        <figcaption>
          <span>${escapeHtml(chapter ? chapter.title : asset.chapter)}</span>
          <strong>${escapeHtml(asset.title)}</strong>
        </figcaption>
      </figure>
    `;
  }).join("");
}

function setupRevealAnimations() {
  const elements = document.querySelectorAll([
    ".hero-copy",
    ".hero-mark",
    ".stats",
    ".about-panel",
    ".section-head",
    ".chapter-nav",
    ".chapter",
    ".article-card",
    ".filterbar",
    ".archive-item",
    ".ending",
  ].join(","));

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elements.forEach(element => element.classList.add("is-visible"));
    return;
  }

  if (!("IntersectionObserver" in window)) {
    elements.forEach(element => element.classList.add("is-visible"));
    return;
  }

  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, {
    rootMargin: "0px 0px -8% 0px",
    threshold: 0.08,
  });

  elements.forEach((element, index) => {
    element.classList.add("reveal-item");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 8, 7) * 34}ms`);
    revealObserver.observe(element);
  });
}

document.getElementById("langToggle").addEventListener("click", () => {
  currentLang = currentLang === "zh" ? "en" : "zh";
  localStorage.setItem("portfolioLanguage", currentLang);
  render();
});

loadPortfolio();
