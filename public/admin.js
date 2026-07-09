let data = null;
let mode = "projects";
let currentProject = 0;
let currentArticle = 0;
let currentGallery = 0;
let galleryFilter = "all";
let selectedAsset = -1;
let selectedGalleryIds = new Set();

const projectForm = document.getElementById("projectForm");
const articleForm = document.getElementById("articleForm");
const galleryForm = document.getElementById("galleryForm");
const publishBtn = document.createElement("button");
publishBtn.className = "nav-button";
publishBtn.id = "publishBtn";
publishBtn.type = "button";
publishBtn.textContent = "发布";
document.getElementById("saveBtn").insertAdjacentElement("afterend", publishBtn);

function setHidden(element, hidden) {
  element.toggleAttribute("hidden", hidden);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

async function checkSession() {
  const res = await fetch("/api/session");
  const session = res.ok ? await res.json() : { ok: false };
  if (session.ok) {
    unlockAdmin();
    await loadData();
    return;
  }
  document.body.classList.add("locked");
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("adminApp").hidden = true;
}

function unlockAdmin() {
  document.body.classList.remove("locked");
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("adminApp").hidden = false;
}

async function loadData() {
  const res = await fetch("/api/draft");
  data = await res.json();
  data.projects = data.projects || [];
  data.articles = data.articles || [];
  data.gallery = data.gallery || [];
  data.chapters = data.chapters || [];
  data.projects.forEach((project, index) => project.order = project.order ?? index);
  data.gallery.forEach((asset, index) => {
    asset.id = asset.id || `gallery-${index}-${Date.now()}`;
    asset.id = String(asset.id);
    asset.order = asset.order ?? index;
    asset.filename = asset.filename || asset.src?.split("/").pop() || "";
  });
  render();
}

function projectList() {
  return [...data.projects].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function articleList() {
  return [...data.articles].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function filteredGallery() {
  const list = galleryFilter === "all"
    ? data.gallery
    : data.gallery.filter(asset => asset.chapter === galleryFilter);
  return [...list].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function galleryAssetId(asset) {
  return String(asset?.id || asset?.src || "");
}

function selectedGalleryAsset() {
  return filteredGallery()[currentGallery];
}

function chapterTitle(chapterId) {
  const chapter = data.chapters.find(item => item.id === chapterId);
  return chapter?.title || chapterId || "未分类";
}

function chaptersOptions(selectedId = "") {
  return data.chapters.map(chapter => `
    <option value="${escapeHtml(chapter.id)}" ${chapter.id === selectedId ? "selected" : ""}>${escapeHtml(chapter.title)}</option>
  `).join("");
}

function render() {
  document.querySelectorAll(".admin-tabs button").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  setHidden(document.getElementById("contentSidebar"), mode === "gallery");
  setHidden(document.getElementById("gallerySidebar"), mode !== "gallery");
  setHidden(projectForm, mode !== "projects");
  setHidden(articleForm, mode !== "articles");
  setHidden(document.getElementById("galleryPanel"), mode !== "gallery");
  setHidden(document.getElementById("projectTools"), mode !== "projects");
  setHidden(document.getElementById("articleTools"), mode !== "articles");
  setHidden(document.getElementById("assetGrid"), mode === "gallery");

  if (mode === "projects") {
    document.getElementById("addItemBtn").textContent = "新增作品";
    document.getElementById("editorMode").textContent = "Project Editor";
    renderContentList();
    renderProjectForm();
  }
  if (mode === "articles") {
    document.getElementById("addItemBtn").textContent = "新增文章";
    document.getElementById("editorMode").textContent = "Article Editor";
    renderContentList();
    renderArticleForm();
  }
  if (mode === "gallery") {
    document.getElementById("editorMode").textContent = "Media Library";
    renderGalleryFilter();
    renderGalleryGrid();
    renderGalleryForm();
  }
}

function renderContentList() {
  const list = mode === "articles" ? articleList() : projectList();
  document.getElementById("itemList").innerHTML = list.map((item, index) => {
    const active = mode === "articles" ? index === currentArticle : index === currentProject;
    const meta = mode === "articles" ? `${item.date || ""} / ${item.category || "Design"}` : item.category || "";
    return `
      <button class="list-item ${active ? "active" : ""}" data-index="${index}" type="button">
        <strong>${escapeHtml(item.title || "Untitled")}</strong><br>${escapeHtml(meta)}
      </button>
    `;
  }).join("");

  document.querySelectorAll(".list-item").forEach(button => {
    button.addEventListener("click", () => {
      commitCurrentForm();
      if (mode === "articles") currentArticle = Number(button.dataset.index);
      else currentProject = Number(button.dataset.index);
      selectedAsset = -1;
      render();
    });
  });
}

function renderProjectForm() {
  const project = projectList()[currentProject];
  if (!project) {
    document.getElementById("editorTitle").textContent = "暂无作品";
    projectForm.reset();
    document.getElementById("assetGrid").innerHTML = "";
    return;
  }
  currentProject = data.projects.indexOf(project);
  document.getElementById("editorTitle").textContent = project.title || "Untitled";
  projectForm.title.value = project.title || "";
  projectForm.category.value = project.category || "";
  projectForm.group.value = project.group || "";
  projectForm.year.value = project.year || "";
  projectForm.role.value = project.role || "";
  projectForm.summary.value = project.summary || "";
  projectForm.tags.value = (project.tags || []).join(", ");
  projectForm.order.value = project.order || 0;
  projectForm.hidden.checked = Boolean(project.hidden);
  renderProjectAssets();
}

function renderArticleForm() {
  const article = articleList()[currentArticle];
  if (!article) {
    document.getElementById("editorTitle").textContent = "暂无文章";
    articleForm.reset();
    document.getElementById("assetGrid").innerHTML = "";
    return;
  }
  currentArticle = data.articles.indexOf(article);
  document.getElementById("editorTitle").textContent = article.title || "Untitled";
  articleForm.title.value = article.title || "";
  articleForm.date.value = article.date || "";
  articleForm.category.value = article.category || "";
  articleForm.published.checked = article.published !== false;
  articleForm.excerpt.value = article.excerpt || "";
  articleForm.content.value = article.content || "";
  articleForm.cover.value = article.cover || "";
  document.getElementById("assetGrid").innerHTML = article.cover ? `
    <figure class="admin-cover-preview"><img src="${escapeHtml(article.cover)}" alt="${escapeHtml(article.title || "")}"><figcaption>文章封面</figcaption></figure>
  ` : "";
}

function renderGalleryFilter() {
  const wrap = document.getElementById("galleryFilter");
  wrap.innerHTML = `
    <button class="${galleryFilter === "all" ? "active" : ""}" type="button" data-chapter="all">全部图库</button>
    ${data.chapters.map(chapter => `
      <button class="${galleryFilter === chapter.id ? "active" : ""}" type="button" data-chapter="${escapeHtml(chapter.id)}">
        ${escapeHtml([chapter.index, chapter.title].filter(Boolean).join(" "))}
      </button>
    `).join("")}
  `;
  wrap.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      commitGalleryForm();
      galleryFilter = button.dataset.chapter;
      currentGallery = 0;
      selectedGalleryIds.clear();
      render();
    });
  });
}

function renderGalleryGrid() {
  const assets = filteredGallery();
  const grid = document.getElementById("galleryAdminGrid");
  grid.innerHTML = assets.length ? assets.map((asset, index) => {
    const id = galleryAssetId(asset);
    const selected = selectedGalleryIds.has(id);
    const filename = asset.filename || asset.src?.split("/").pop() || "Media";
    return `
      <button class="gallery-admin-thumb ${index === currentGallery ? "active" : ""} ${selected ? "selected" : ""}" type="button" data-index="${index}" data-id="${escapeHtml(id)}">
        <img src="${escapeHtml(asset.src)}" alt="${escapeHtml(filename)}">
        <b>${selected ? "已选" : "选择"}</b>
        <span>${escapeHtml(chapterTitle(asset.chapter))}</span>
        <strong>${escapeHtml(filename)}</strong>
      </button>
    `;
  }).join("") : `<p class="empty-note">当前章节暂无图库图片。</p>`;

  grid.querySelectorAll(".gallery-admin-thumb").forEach(button => {
    button.addEventListener("click", () => {
      commitGalleryForm();
      currentGallery = Number(button.dataset.index);
      const id = button.dataset.id;
      if (selectedGalleryIds.has(id)) selectedGalleryIds.delete(id);
      else selectedGalleryIds.add(id);
      renderGalleryGrid();
      renderGalleryForm();
    });
  });

  document.getElementById("gallerySelectionNote").textContent = `已选择 ${selectedGalleryIds.size} 张图片`;
}

function renderGalleryForm() {
  const asset = selectedGalleryAsset();
  galleryForm.chapter.innerHTML = chaptersOptions(asset?.chapter || data.chapters[0]?.id);
  if (!asset) {
    document.getElementById("editorTitle").textContent = "图库管理";
    galleryForm.reset();
    return;
  }
  document.getElementById("editorTitle").textContent = chapterTitle(asset.chapter);
  galleryForm.chapter.value = asset.chapter || data.chapters[0]?.id || "";
  galleryForm.src.value = asset.src || "";
  galleryForm.size.value = `${asset.width || "-"} x ${asset.height || "-"}`;
  galleryForm.order.value = asset.order || 0;
}

function commitCurrentForm() {
  if (!data) return;
  if (mode === "articles") commitArticleForm();
  else if (mode === "gallery") commitGalleryForm();
  else commitProjectForm();
}

function commitProjectForm() {
  const project = data.projects[currentProject];
  if (!project) return;
  project.title = projectForm.title.value.trim();
  project.category = projectForm.category.value.trim();
  project.group = projectForm.group.value.trim();
  project.year = projectForm.year.value.trim();
  project.role = projectForm.role.value.trim();
  project.summary = projectForm.summary.value.trim();
  project.tags = projectForm.tags.value.split(",").map(tag => tag.trim()).filter(Boolean);
  project.order = Number(projectForm.order.value || 0);
  project.hidden = projectForm.hidden.checked;
  project.cover = project.assets?.[0]?.src || project.cover || "";
}

function commitArticleForm() {
  const article = data.articles[currentArticle];
  if (!article) return;
  article.title = articleForm.title.value.trim();
  article.date = articleForm.date.value;
  article.category = articleForm.category.value.trim();
  article.published = articleForm.published.checked;
  article.excerpt = articleForm.excerpt.value.trim();
  article.content = articleForm.content.value.trim();
  article.cover = articleForm.cover.value.trim();
}

function commitGalleryForm() {
  const asset = selectedGalleryAsset();
  if (!asset) return;
  asset.chapter = galleryForm.chapter.value;
  asset.order = Number(galleryForm.order.value || 0);
}

function renderProjectAssets() {
  const project = data.projects[currentProject];
  document.getElementById("assetGrid").innerHTML = (project?.assets || []).map((asset, index) => `
    <button class="asset-thumb ${index === selectedAsset ? "selected" : ""}" data-index="${index}" type="button">
      <img src="${escapeHtml(asset.src)}" alt="${escapeHtml(project.title || "")}">
    </button>
  `).join("");
  document.querySelectorAll(".asset-thumb").forEach(button => {
    button.addEventListener("click", () => {
      selectedAsset = Number(button.dataset.index);
      renderProjectAssets();
    });
  });
}

async function save(options = {}) {
  if (!options.skipCommit) commitCurrentForm();
  data.projects.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  data.articles.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  data.gallery.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const res = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status === 401) alert("登录已失效，请重新登录。");
    throw new Error("保存失败");
  }
  if (options.alertOnSuccess !== false) alert("草稿已保存。前台暂不更新，点击发布后才会更新。");
  render();
}

async function publish() {
  await save({ alertOnSuccess: false });
  const res = await fetch("/api/publish", { method: "POST" });
  if (!res.ok) {
    if (res.status === 401) alert("登录已失效，请重新登录。");
    throw new Error("发布失败");
  }
  alert("发布成功，前台已更新。");
}

async function uploadImage(file) {
  const dataUrl = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, dataUrl }),
  });
  if (!res.ok) throw new Error("上传失败");
  return res.json();
}

function imageMeta(file, src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({
      id: `gallery-${Date.now()}-${Math.round(Math.random() * 100000)}`,
      chapter: galleryFilter === "all" ? data.chapters[0]?.id || "practice" : galleryFilter,
      src,
      filename: file.name,
      width: img.naturalWidth,
      height: img.naturalHeight,
      orientation: img.naturalHeight > img.naturalWidth * 1.12 ? "portrait" : img.naturalWidth > img.naturalHeight * 1.12 ? "landscape" : "square",
      order: data.gallery.length,
    });
    img.src = src;
  });
}

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const password = event.currentTarget.password.value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    document.getElementById("loginError").textContent = "密码不正确";
    return;
  }
  document.getElementById("loginError").textContent = "";
  unlockAdmin();
  await loadData();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
});

document.querySelectorAll(".admin-tabs button").forEach(button => {
  button.addEventListener("click", () => {
    commitCurrentForm();
    mode = button.dataset.mode;
    selectedAsset = -1;
    render();
  });
});

document.getElementById("saveBtn").addEventListener("click", save);
publishBtn.addEventListener("click", publish);
document.getElementById("exportBtn").addEventListener("click", () => {
  commitCurrentForm();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "portfolio.json";
  link.click();
});

document.getElementById("addItemBtn").addEventListener("click", () => {
  commitCurrentForm();
  if (mode === "articles") {
    data.articles.unshift({
      id: `article-${Date.now()}`,
      title: "新的设计思考",
      date: new Date().toISOString().slice(0, 10),
      category: "Design Thinking",
      excerpt: "",
      content: "",
      cover: "",
      published: true,
    });
    currentArticle = 0;
  } else {
    data.projects.push({
      id: `project-${Date.now()}`,
      title: "New Project",
      category: "New Category",
      group: "Other",
      year: "2026",
      role: "",
      summary: "",
      tags: [],
      order: data.projects.length,
      assets: [],
      cover: "",
    });
    currentProject = data.projects.length - 1;
  }
  render();
});

document.getElementById("deleteArticleBtn").addEventListener("click", () => {
  if (mode !== "articles" || !data.articles[currentArticle]) return;
  if (!confirm("确定删除这篇文章？")) return;
  data.articles.splice(currentArticle, 1);
  currentArticle = Math.max(0, currentArticle - 1);
  render();
});

document.getElementById("removeAssetBtn").addEventListener("click", () => {
  const project = data.projects[currentProject];
  if (!project || selectedAsset < 0) return;
  project.assets.splice(selectedAsset, 1);
  project.cover = project.assets[0]?.src || "";
  selectedAsset = -1;
  renderProjectAssets();
});

document.getElementById("deleteGalleryBtn").addEventListener("click", () => {
  const asset = selectedGalleryAsset();
  if (!asset) return;
  if (!confirm("确定删除当前图库图片？")) return;
  const realIndex = data.gallery.indexOf(asset);
  if (realIndex >= 0) data.gallery.splice(realIndex, 1);
  selectedGalleryIds.delete(galleryAssetId(asset));
  currentGallery = Math.max(0, currentGallery - 1);
  render();
});

document.getElementById("copyGalleryPathBtn").addEventListener("click", async () => {
  const asset = selectedGalleryAsset();
  if (!asset?.src) return;
  await navigator.clipboard.writeText(asset.src);
  alert("图片路径已复制");
});

document.getElementById("deleteSelectedGalleryBtn").addEventListener("click", async () => {
  if (!selectedGalleryIds.size) {
    alert("请先在图片网格中选择要删除的图片。");
    return;
  }
  if (!confirm(`确定删除选中的 ${selectedGalleryIds.size} 张图库图片？`)) return;
  data.gallery = data.gallery.filter(asset => !selectedGalleryIds.has(galleryAssetId(asset)));
  selectedGalleryIds.clear();
  currentGallery = 0;
  render();
  await save({ skipCommit: true });
});

document.getElementById("assetInput").addEventListener("change", async event => {
  const files = [...event.target.files];
  const project = data.projects[currentProject];
  if (!project) return;
  project.assets = project.assets || [];
  for (const file of files) {
    const uploaded = await uploadImage(file);
    project.assets.push({ src: uploaded.src, alt: project.title });
  }
  project.cover = project.assets[0]?.src || "";
  renderProjectAssets();
  event.target.value = "";
});

document.getElementById("articleCoverInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  const article = data.articles[currentArticle];
  if (!file || !article) return;
  const uploaded = await uploadImage(file);
  article.cover = uploaded.src;
  articleForm.cover.value = uploaded.src;
  renderArticleForm();
  event.target.value = "";
});

document.getElementById("galleryInput").addEventListener("change", async event => {
  const files = [...event.target.files];
  for (const file of files) {
    const uploaded = await uploadImage(file);
    data.gallery.push(await imageMeta(file, uploaded.src));
  }
  currentGallery = Math.max(0, filteredGallery().length - files.length);
  render();
  event.target.value = "";
});

projectForm.addEventListener("input", () => {
  commitProjectForm();
  document.getElementById("editorTitle").textContent = data.projects[currentProject]?.title || "Untitled";
});

articleForm.addEventListener("input", () => {
  commitArticleForm();
  document.getElementById("editorTitle").textContent = data.articles[currentArticle]?.title || "Untitled";
});

galleryForm.addEventListener("input", () => {
  commitGalleryForm();
  document.getElementById("editorTitle").textContent = chapterTitle(selectedGalleryAsset()?.chapter);
  renderGalleryGrid();
});

checkSession();
