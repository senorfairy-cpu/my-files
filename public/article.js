let portfolio = null;
let languageContent = null;
let currentLang = localStorage.getItem("portfolioLanguage") || "zh";
if (!["zh", "en"].includes(currentLang)) currentLang = "zh";

async function loadData() {
  const res = await fetch("/api/portfolio").catch(() => fetch("/data/portfolio.json"));
  portfolio = await res.json();
  const langRes = await fetch("/language-content.json").catch(() => null);
  languageContent = langRes?.ok ? await langRes.json() : null;
  renderArticle();
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

function currentArticle() {
  const id = new URLSearchParams(location.search).get("id");
  const fallback = (portfolio.articles || []).find(article => article.published !== false);
  const article = (portfolio.articles || []).find(item => item.id === id) || fallback;
  return article ? localizedArticle(article) : null;
}

function applyCommonText(article) {
  const profile = { ...portfolio.profile, ...(langData().profile || {}) };
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  document.title = `${article?.title || "Article"} - ${profile.name || "Portfolio"}`;
  document.querySelector(".brand").textContent = profile.title || "Portfolio";
  document.getElementById("langToggle").textContent = t("language.toggle", currentLang === "zh" ? "EN" : "中文");
  document.getElementById("footerName").textContent = profile.email || profile.name || "";
  document.getElementById("footerTagline").textContent = t("footer.tagline", "期待与你合作。");
  document.getElementById("footerLocation").textContent = profile.location || t("footer.location", "中国成都");
}

function renderArticle() {
  const article = currentArticle();
  applyCommonText(article);
  const page = document.getElementById("articlePage");
  if (!article) {
    page.innerHTML = `<section class="section-head"><h1>${escapeHtml(t("thinking.empty", "暂无文章。"))}</h1></section>`;
    return;
  }
  page.innerHTML = `
    <article class="article-detail">
      <a class="back-link" href="/blog">${escapeHtml(t("blog.back", "返回 Blog"))}</a>
      <p class="eyebrow">${escapeHtml(article.date || "")} · ${escapeHtml(article.category || t("common.design", "Design"))}</p>
      <h1>${escapeHtml(article.title)}</h1>
      ${article.cover ? `<img class="article-detail-cover" src="${escapeHtml(article.cover)}" alt="${escapeHtml(article.title)}">` : ""}
      <div class="article-content">
        ${String(article.content || "")
          .split(/\n{2,}/)
          .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
          .join("")}
      </div>
    </article>
  `;
}

document.getElementById("langToggle").addEventListener("click", () => {
  currentLang = currentLang === "zh" ? "en" : "zh";
  localStorage.setItem("portfolioLanguage", currentLang);
  renderArticle();
});

loadData();
