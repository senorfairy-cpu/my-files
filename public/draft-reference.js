let refPortfolio = null;
let refLang = null;

async function loadRefDraft() {
  const portfolioRes = await fetch("/api/portfolio").catch(() => fetch("/data/portfolio.json"));
  refPortfolio = await portfolioRes.json();
  const langRes = await fetch("/language-content.json").catch(() => null);
  refLang = langRes?.ok ? await langRes.json() : null;
  renderRefDraft();
}

function refData() {
  return refLang?.zh || {};
}

function refText(path, fallback = "") {
  return path.split(".").reduce((value, key) => value?.[key], refData()) ?? fallback;
}

function refEscape(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function refGallery() {
  return (refPortfolio.gallery || []).filter(asset => asset.hidden !== true && asset.src);
}

function refGalleryFor(chapterId) {
  return refGallery().filter(asset => asset.chapter === chapterId);
}

function refChapter(chapter) {
  return {
    ...chapter,
    ...(refData().chaptersById?.[chapter.id] || {}),
  };
}

function refCoverFor(chapterId, assets = refGalleryFor(chapterId)) {
  return assets.find(asset => asset.showInChapterCover === true)
    || assets.find(asset => asset.orientation === "landscape")
    || assets[0]
    || refGallery()[0];
}

function refPreviewFor(chapterId) {
  const assets = refGalleryFor(chapterId);
  const selected = assets.filter(asset => asset.showInChapterStrip === true);
  return (selected.length ? selected : assets).filter(asset => asset.src).slice(0, 4);
}

function refHomeGallery() {
  const gallery = refGallery();
  const selected = gallery.filter(asset => asset.showOnHome === true);
  return (selected.length ? selected : gallery).slice(0, 8);
}

function renderRefDraft() {
  const profile = { ...(refPortfolio.profile || {}), ...(refData().profile || {}) };
  const heroAsset = profile.heroImage ? { src: profile.heroImage } : refCoverFor("campaign-kv");
  const chapters = (refPortfolio.chapters || []).map(refChapter);

  document.title = `${profile.title || "Portfolio"} - Reference Draft`;
  document.getElementById("refTitle").textContent = profile.title || "打造您的专属品牌";
  document.getElementById("refContact").textContent = profile.email || profile.name || "";
  document.getElementById("refHeroEyebrow").textContent = refText("hero.eyebrow", "Graphic Designer Portfolio");
  document.getElementById("refHeroName").textContent = profile.name || "MAKEDO";
  document.getElementById("refHeroIntro").textContent = profile.intro || "";
  document.getElementById("refAboutTitle").textContent = refText("about.title", "科技产品商业视觉设计师");
  document.getElementById("refAboutBody").textContent = refText("about.body", "");
  document.getElementById("refArchiveTitle").textContent = refText("archive.title", "图库精选");

  if (heroAsset?.src) {
    document.getElementById("refHeroMedia").style.backgroundImage = `linear-gradient(90deg, rgba(0,0,0,.82), rgba(0,0,0,.28), rgba(145,54,10,.35)), url("${heroAsset.src}")`;
  }

  document.getElementById("refStats").innerHTML = (refData().stats || refPortfolio.stats || []).map((item, index) => `
    <article>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${refEscape(item.value)}</strong>
      <p>${refEscape(item.label)}</p>
    </article>
  `).join("");

  document.getElementById("refChapters").innerHTML = chapters.slice(0, 6).map((chapter, index) => {
    const cover = refCoverFor(chapter.id);
    const thumbs = refPreviewFor(chapter.id);
    return `
      <article class="ref-project">
        <div class="ref-project-bg" style="background-image:linear-gradient(90deg, rgba(0,0,0,.8), rgba(0,0,0,.22), rgba(140,52,10,.34)), url('${refEscape(cover?.src || "")}')"></div>
        <div class="ref-project-copy">
          <p>[ chapter ${refEscape(chapter.index || String(index + 1).padStart(2, "0"))} ]</p>
          <h2>${refEscape(chapter.title)}</h2>
          <span>${refEscape(chapter.summary)}</span>
        </div>
        <div class="ref-project-matrix">
          ${(thumbs.length ? thumbs : [cover]).filter(Boolean).map((asset, thumbIndex) => `
            <figure>
              <img src="${refEscape(asset.src)}" alt="${refEscape(asset.filename || asset.title || chapter.title)}" loading="lazy">
              <figcaption>${String(thumbIndex + 1).padStart(2, "0")}</figcaption>
            </figure>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");

  document.getElementById("refMiniGallery").innerHTML = refHomeGallery().map(asset => `
    <figure>
      <img src="${refEscape(asset.src)}" alt="${refEscape(asset.filename || asset.title || "portfolio image")}" loading="lazy">
    </figure>
  `).join("");
}

loadRefDraft();
