let portfolio = null;
let languageContent = null;
let currentLang = localStorage.getItem("portfolioLanguage") || "zh";
if (!["zh", "en"].includes(currentLang)) currentLang = "zh";
let activeChapter = "all";
let revealObserver = null;
let mediaZoom = "fit";
let mediaPan = { x: 0, y: 0 };
let mediaDrag = null;

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

function homeGallery() {
  const gallery = visibleGallery();
  const selected = gallery.filter(asset => asset.showOnHome === true);
  return selected.length ? selected : gallery;
}

function galleryFor(chapterId) {
  return visibleGallery().filter(asset => asset.chapter === chapterId);
}

function mediaAssetId(asset) {
  return String(asset?.id || asset?.src || "");
}

function homeGalleryFor(chapterId) {
  return homeGallery().filter(asset => asset.chapter === chapterId);
}

function coverFor(chapterId, assets = galleryFor(chapterId)) {
  const selected = assets.find(asset => asset.showInChapterCover === true);
  if (selected) return selected;
  return assets.find(asset => asset.orientation === "landscape") || assets[0] || visibleGallery()[0];
}

function chapterPreviewAssets(chapterId) {
  const assets = galleryFor(chapterId);
  const selected = assets.filter(asset => asset.showInChapterStrip === true);
  return (selected.length ? selected : assets).slice(0, 18);
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
  const contact = {
    title: t("contact.title", "有海报、电商、展会、目录或视频项目，可以先加微信沟通。"),
    body: t("contact.body", "告诉我你的项目目标、使用场景和交付时间，我会根据内容复杂度给出建议。"),
    emailLabel: t("contact.emailLabel", "邮箱"),
    phoneLabel: t("contact.phoneLabel", "电话"),
    wechatLabel: t("contact.wechatLabel", "微信二维码"),
    qrPlaceholder: t("contact.qrPlaceholder", "上传二维码"),
    note: t("contact.note", "也可以通过邮箱先发送项目说明。"),
    ...(portfolio.contact || {}),
  };
  const chapters = (portfolio.chapters || []).map(localizedChapter);
  const gallery = visibleGallery();
  const heroAsset = profile.heroImage ? { src: profile.heroImage } : coverFor("product-marketing") || gallery[0];

  document.title = `${profile.name} - Portfolio`;
  document.querySelector(".brand").textContent = profile.title;
  document.getElementById("profileName").textContent = profile.title;
  document.getElementById("profileIntro").textContent = profile.intro;
  document.getElementById("footerName").textContent = profile.email || profile.name;
  document.getElementById("heroCount").textContent = gallery.length;
  document.getElementById("aboutTitle").textContent = t("about.title", "科技产品商业视觉设计师");
  document.getElementById("aboutBody").textContent = t("about.body", "定位于品牌系统、产品营销视觉、海报 KV、3D 场景、画册、展会视觉与 AI 辅助创意工作流。");
  document.getElementById("chaptersTitle").textContent = t("chapters.title", "按照“品牌 × 产品 × 营销视觉”的求职叙事重组作品。");
  document.getElementById("thinkingTitle").textContent = t("thinking.title", "设计心得、项目复盘与方法沉淀。");
  document.getElementById("archiveTitle").textContent = t("archive.title", "素材库图片按章节分类形成可浏览图库。");
  document.getElementById("footerTagline").textContent = t("footer.tagline", "期待与你合作。");
  document.getElementById("footerLocation").textContent = profile.location || t("footer.location", "中国成都");
  document.getElementById("contactTitle").textContent = contact.title;
  document.getElementById("contactBody").textContent = contact.body;
  document.getElementById("contactQrLabel").textContent = contact.wechatLabel;
  document.getElementById("contactNote").textContent = contact.note || "";
  document.getElementById("contactQrBox").innerHTML = contact.qrImage
    ? `<img src="${escapeHtml(contact.qrImage)}" alt="${escapeHtml(contact.wechatLabel)}">`
    : escapeHtml(contact.qrPlaceholder);
  document.getElementById("contactActions").innerHTML = [
    contact.email ? `<a class="button primary" href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.emailLabel)} ${escapeHtml(contact.email)}</a>` : "",
    contact.phone ? `<a class="button ghost" href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phoneLabel)} ${escapeHtml(contact.phone)}</a>` : "",
    contact.wechat ? `<span class="contact-inline">${escapeHtml(contact.wechat)}</span>` : "",
  ].filter(Boolean).join("");
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
    const cover = coverFor(chapter.id, assets);
    const preview = chapterPreviewAssets(chapter.id);
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
          ${preview.map(asset => `
            <figure class="chapter-thumb ${asset.orientation ? `is-${escapeHtml(asset.orientation)}` : ""}">
              <button class="media-trigger" type="button" data-media-id="${escapeHtml(mediaAssetId(asset))}" aria-label="查看图片详情">
              <img loading="lazy" src="${asset.src}" alt="${escapeHtml(asset.title)}">
              </button>
            </figure>
          `).join("")}
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
  const articles = sortedArticles().slice(0, 3).map(localizedArticle);
  document.getElementById("articleGrid").innerHTML = articles.length ? articles.map(article => `
    <a class="article-card" href="/article?id=${encodeURIComponent(article.id)}">
      ${article.cover ? `<img src="${article.cover}" alt="${escapeHtml(article.title)}">` : ""}
      <span>${escapeHtml(article.date)} · ${escapeHtml(article.category || t("common.design", "Design"))}</span>
      <strong>${escapeHtml(article.title)}</strong>
      <p>${escapeHtml(article.excerpt)}</p>
    </a>
  `).join("") : `<p class="empty-note">${escapeHtml(t("thinking.empty", "暂无文章。可在后台新增设计心得。"))}</p>`;
}

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
  const assets = activeChapter === "all" ? homeGallery() : homeGalleryFor(activeChapter);
  document.querySelectorAll("#filters button").forEach(button => {
    button.classList.toggle("active", button.dataset.id === activeChapter);
  });
  document.getElementById("masonry").innerHTML = assets.map(asset => {
    const chapter = chapterById(asset.chapter);
    const filename = asset.filename || asset.title || asset.src?.split("/").pop() || "Media";
    return `
      <figure class="archive-item">
        <button class="media-trigger" type="button" data-media-id="${escapeHtml(mediaAssetId(asset))}" aria-label="查看图片详情">
          <img loading="lazy" src="${asset.src}" alt="${escapeHtml(filename)}">
        </button>
        <figcaption>
          <span>${escapeHtml(chapter ? chapter.title : asset.chapter)}</span>
          <strong>${escapeHtml(filename)}</strong>
        </figcaption>
      </figure>
    `;
  }).join("");
}

function findMediaAsset(id) {
  return visibleGallery().find(asset => mediaAssetId(asset) === id);
}

function openMediaModal(id) {
  const asset = findMediaAsset(id);
  if (!asset) return;
  const filename = asset.filename || asset.title || asset.src?.split("/").pop() || "Media";
  const modal = document.getElementById("mediaModal");
  const image = document.getElementById("mediaModalImage");
  const sizeText = asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "-";
  const meta = [
    ["文件名", filename],
    ["图片尺寸", sizeText],
  ];

  image.src = asset.src;
  image.alt = filename;
  image.draggable = false;
  document.getElementById("mediaModalTitle").textContent = filename;
  document.getElementById("mediaModalMeta").innerHTML = meta.map(([label, value]) => `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `).join("");
  mediaZoom = "fit";
  mediaPan = { x: 0, y: 0 };
  applyMediaZoom();
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeMediaModal() {
  const modal = document.getElementById("mediaModal");
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  mediaPan = { x: 0, y: 0 };
  mediaDrag = null;
  document.getElementById("mediaModalImage").removeAttribute("src");
}

function applyMediaZoom() {
  const image = document.getElementById("mediaModalImage");
  const preview = image.closest(".media-modal-preview");
  image.classList.toggle("is-fit", mediaZoom === "fit");
  preview.classList.toggle("is-fit", mediaZoom === "fit");
  if (mediaZoom === "fit") {
    image.style.width = "";
    image.style.transform = "";
    return;
  }
  const naturalWidth = image.naturalWidth || 1200;
  image.style.width = `${Math.round(naturalWidth * Number(mediaZoom) / 100)}px`;
  image.style.transform = `translate(${mediaPan.x}px, ${mediaPan.y}px)`;
}

function updateMediaZoom(action) {
  const wasFit = mediaZoom === "fit";
  if (action === "fit") {
    mediaZoom = "fit";
    mediaPan = { x: 0, y: 0 };
  } else if (action === "actual") {
    mediaZoom = 100;
    mediaPan = { x: 0, y: 0 };
  }
  else {
    const current = mediaZoom === "fit" ? 100 : Number(mediaZoom);
    const next = action === "in" ? current + 25 : current - 25;
    mediaZoom = Math.max(50, Math.min(250, next));
    if (wasFit) mediaPan = { x: 0, y: 0 };
  }
  applyMediaZoom();
}

function startMediaDrag(event) {
  if (mediaZoom === "fit" || event.target.closest(".media-zoom-controls")) return;
  if (event.button !== 0) return;
  const preview = event.currentTarget;
  event.preventDefault();
  mediaDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    panX: mediaPan.x,
    panY: mediaPan.y,
  };
  preview.classList.add("is-dragging");
  try {
    preview.setPointerCapture(event.pointerId);
  } catch {
    // Some synthetic pointer events cannot be captured.
  }
}

function moveMediaDrag(event) {
  if (!mediaDrag || mediaDrag.pointerId !== event.pointerId) return;
  if ((event.buttons & 1) !== 1) {
    stopMediaDrag(event);
    return;
  }
  event.preventDefault();
  mediaPan = {
    x: mediaDrag.panX + event.clientX - mediaDrag.startX,
    y: mediaDrag.panY + event.clientY - mediaDrag.startY,
  };
  applyMediaZoom();
}

function stopMediaDrag(event) {
  if (!mediaDrag || mediaDrag.pointerId !== event.pointerId) return;
  const preview = event.currentTarget;
  mediaDrag = null;
  preview.classList.remove("is-dragging");
  try {
    preview.releasePointerCapture(event.pointerId);
  } catch {
    // Ignore browsers that have already released the pointer.
  }
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
    ".contact-panel",
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

document.addEventListener("click", async event => {
  const mediaTrigger = event.target.closest("[data-media-id]");
  if (mediaTrigger) {
    event.preventDefault();
    openMediaModal(mediaTrigger.dataset.mediaId);
    return;
  }

  if (event.target.id === "mediaModal" || event.target.id === "mediaModalClose") {
    closeMediaModal();
    return;
  }

  const zoomButton = event.target.closest("[data-media-zoom]");
  if (zoomButton) {
    updateMediaZoom(zoomButton.dataset.mediaZoom);
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !document.getElementById("mediaModal").hidden) {
    closeMediaModal();
  }
});

const mediaPreview = document.querySelector(".media-modal-preview");
if (mediaPreview) {
  mediaPreview.addEventListener("pointerdown", startMediaDrag);
  mediaPreview.addEventListener("pointermove", moveMediaDrag);
  mediaPreview.addEventListener("pointerup", stopMediaDrag);
  mediaPreview.addEventListener("pointercancel", stopMediaDrag);
}

loadPortfolio();
