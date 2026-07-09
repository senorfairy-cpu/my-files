let portfolio = null;
let languageContent = null;
let currentLang = localStorage.getItem("portfolioLanguage") || "zh";
if (!["zh", "en"].includes(currentLang)) currentLang = "zh";

async function loadData() {
  const res = await fetch("/api/portfolio").catch(() => fetch("/data/portfolio.json"));
  portfolio = await res.json();
  const langRes = await fetch("/language-content.json").catch(() => null);
  languageContent = langRes?.ok ? await langRes.json() : null;
  renderBlog();
}

function langData() {
  return languageContent?.[currentLang] || {};
}

function t(path, fallback = "") {
  return path.split(".").reduce((value, key) => value?.[key], langData()) ?? fallback;
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

function localizedArticle(article) {
  return {
    ...article,
    ...((langData().articlesById || {})[article.id] || {}),
  };
}

function sortedArticles() {
  return (portfolio.articles || [])
    .filter(article => article.published !== false)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .map(localizedArticle);
}

function applyCommonText() {
  const profile = { ...portfolio.profile, ...(langData().profile || {}) };
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  document.title = `${t("nav.blog", "Blog")} - ${profile.name || "Portfolio"}`;
  document.querySelector(".brand").textContent = profile.title || "Portfolio";
  document.getElementById("langToggle").textContent = t("language.toggle", currentLang === "zh" ? "EN" : "中文");
  document.getElementById("footerName").textContent = profile.email || profile.name || "";
  document.getElementById("footerTagline").textContent = t("footer.tagline", "期待与你合作。");
  document.getElementById("footerLocation").textContent = profile.location || t("footer.location", "中国成都");
}

function renderBlog() {
  applyCommonText();
  document.getElementById("blogEyebrow").textContent = t("thinking.eyebrow", "Design Thinking");
  document.getElementById("blogTitle").textContent = t("thinking.title", "设计心得、项目复盘与方法沉淀。");
  const articles = sortedArticles();
  document.getElementById("blogList").innerHTML = articles.length ? articles.map(article => `
    <a class="blog-list-item" href="/article?id=${encodeURIComponent(article.id)}">
      <div>
        <span>${escapeHtml(article.date || "")} · ${escapeHtml(article.category || t("common.design", "Design"))}</span>
        <strong>${escapeHtml(article.title)}</strong>
        <p>${escapeHtml(article.excerpt)}</p>
      </div>
      ${article.cover ? `<img src="${escapeHtml(article.cover)}" alt="${escapeHtml(article.title)}">` : ""}
    </a>
  `).join("") : `<p class="empty-note">${escapeHtml(t("thinking.empty", "暂无文章。"))}</p>`;
}

document.getElementById("langToggle").addEventListener("click", () => {
  currentLang = currentLang === "zh" ? "en" : "zh";
  localStorage.setItem("portfolioLanguage", currentLang);
  renderBlog();
});

loadData();
