let portfolio = null;
let activeChapter = "全部";

async function loadPortfolio() {
  const res = await fetch("/api/portfolio").catch(() => fetch("/data/portfolio.json"));
  portfolio = await res.json();
  render();
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
  return (portfolio.chapters || []).find(chapter => chapter.id === id);
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
  const profile = portfolio.profile;
  const chapters = portfolio.chapters || [];
  const gallery = visibleGallery();
  const heroAsset = coverFor("product-marketing") || gallery[0];

  document.title = `${profile.name} - Portfolio`;
  document.querySelector(".brand").textContent = profile.title;
  document.getElementById("profileName").textContent = profile.title;
  document.getElementById("profileIntro").textContent = profile.intro;
  document.getElementById("footerName").textContent = profile.email || profile.name;
  document.getElementById("endingContact").textContent = `${profile.email || "hello@example.com"} · ${profile.location || "Chengdu, China"}`;
  document.getElementById("heroCount").textContent = gallery.length;
  if (heroAsset) {
    document.getElementById("heroBg").style.backgroundImage = `linear-gradient(90deg, rgba(9,9,8,.96) 0%, rgba(9,9,8,.70) 42%, rgba(9,9,8,.35) 100%), url("${heroAsset.src}")`;
  }

  document.getElementById("stats").innerHTML = (portfolio.stats || []).map(item => `
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
            <span>${assets.length} images</span>
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
}

function renderArticles() {
  const articles = sortedArticles();
  document.getElementById("articleGrid").innerHTML = articles.length ? articles.map(article => `
    <button class="article-card" type="button" data-id="${article.id}">
      ${article.cover ? `<img src="${article.cover}" alt="${escapeHtml(article.title)}">` : ""}
      <span>${escapeHtml(article.date)} · ${escapeHtml(article.category || "Design")}</span>
      <strong>${escapeHtml(article.title)}</strong>
      <p>${escapeHtml(article.excerpt)}</p>
    </button>
  `).join("") : `<p class="empty-note">暂无文章。可在后台新增设计心得。</p>`;

  document.querySelectorAll(".article-card").forEach(card => {
    card.addEventListener("click", () => openArticle(card.dataset.id));
  });
}

function openArticle(id) {
  const article = (portfolio.articles || []).find(item => item.id === id);
  if (!article) return;
  document.getElementById("modalMeta").textContent = `${article.date || ""} · ${article.category || "Design"}`;
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
  const chapters = portfolio.chapters || [];
  const filters = ["全部", ...chapters.map(chapter => chapter.title)];
  document.getElementById("filters").innerHTML = filters.map(label => `
    <button class="${label === activeChapter ? "active" : ""}" data-label="${escapeHtml(label)}">${escapeHtml(label)}</button>
  `).join("");
  document.querySelectorAll("#filters button").forEach(button => {
    button.addEventListener("click", () => {
      activeChapter = button.dataset.label;
      renderArchive();
    });
  });
}

function renderArchive() {
  const chapters = portfolio.chapters || [];
  const selected = chapters.find(chapter => chapter.title === activeChapter);
  const assets = activeChapter === "全部" ? visibleGallery() : galleryFor(selected?.id);
  document.querySelectorAll("#filters button").forEach(button => {
    button.classList.toggle("active", button.dataset.label === activeChapter);
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

loadPortfolio();
