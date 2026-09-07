let data = null;
let mode = "projects";
let currentProject = 0;
let currentArticle = 0;
let currentGallery = 0;
let galleryFilter = "all";
let galleryUsageFilter = "all";
let gallerySearchTerm = "";
let selectedAsset = -1;
let selectedGalleryIds = new Set();
let draggedGalleryIndex = -1;

const projectForm = document.getElementById("projectForm");
const articleForm = document.getElementById("articleForm");
const galleryForm = document.getElementById("galleryForm");
const settingsForm = document.getElementById("settingsForm");
const publishBtn = document.createElement("button");
publishBtn.className = "nav-button";
publishBtn.id = "publishBtn";
publishBtn.type = "button";
publishBtn.textContent = "发布";
document.getElementById("saveBtn").insertAdjacentElement("afterend", publishBtn);
const statusToast = document.createElement("div");
statusToast.className = "admin-toast";
statusToast.hidden = true;
statusToast.setAttribute("role", "status");
statusToast.setAttribute("aria-live", "polite");
document.body.appendChild(statusToast);
let toastTimer = null;

function setFieldLabel(control, text) {
  const label = control?.closest("label");
  if (!label) return;
  [...label.childNodes].forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      node.textContent = text;
    }
  });
}

function setupAdminForHomepageLayout() {
  const indexInput = document.getElementById("chapterIndexInput");
  const titleInput = document.getElementById("chapterTitleInput");
  const subtitleInput = document.getElementById("chapterSubtitleInput");
  setFieldLabel(indexInput, "章节编号");
  setFieldLabel(titleInput, "章节名称");
  setFieldLabel(subtitleInput, "英文副标题");
  titleInput.placeholder = "品牌系统设计";

  if (!document.getElementById("chapterRatioInput")) {
    subtitleInput.closest("label").insertAdjacentHTML("afterend", `
      <label>首页占比<input id="chapterRatioInput" placeholder="20%"></label>
      <label class="full">首页卡片简介<textarea id="chapterSummaryInput" rows="3" placeholder="用于前台章节卡片的简介"></textarea></label>
    `);
  }

  document.getElementById("saveChapterBtn").textContent = "保存章节";
  document.getElementById("addChapterBtn").textContent = "新增章节";
  document.getElementById("deleteChapterBtn").textContent = "删除章节";
  document.querySelector("#gallerySelectionBar strong").textContent = "已选择 0 张图片";
  document.querySelector("#gallerySelectionBar span").textContent = "点击图片可选择或取消选择，拖动图片可调整排序。";

  setFieldLabel(galleryForm.chapter, "所属章节");
  setFieldLabel(galleryForm.src, "图片路径");
  setFieldLabel(galleryForm.size, "图片尺寸");
  setFieldLabel(galleryForm.order, "排序");
  setFieldLabel(galleryForm.showInHeroWall, "首屏动态图");
  setFieldLabel(galleryForm.showInChapterCover, "首页章节卡片背景图");
  setFieldLabel(galleryForm.showInChapterStrip, "首页章节卡片矩阵图");
  setFieldLabel(galleryForm.showOnHome, "底部图库展示");

  document.getElementById("copyGalleryPathBtn").textContent = "复制图片路径";
  document.getElementById("deleteGalleryBtn").textContent = "删除当前图片";
}

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

function showStatus(message, type = "success") {
  clearTimeout(toastTimer);
  statusToast.textContent = message;
  statusToast.dataset.type = type;
  statusToast.hidden = false;
  if (type !== "loading") {
    toastTimer = setTimeout(() => {
      statusToast.hidden = true;
    }, 4200);
  }
}

function setActionBusy(isBusy) {
  document.getElementById("saveBtn").disabled = isBusy;
  publishBtn.disabled = isBusy;
}

async function responseErrorMessage(res, fallback) {
  try {
    const payload = await res.json();
    return payload.error || fallback;
  } catch {
    return fallback;
  }
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
  data.profile = data.profile || {};
  data.contact = normalizeContact(data.contact || {}, data.profile);
  data.projects.forEach((project, index) => project.order = project.order ?? index);
  data.gallery.forEach((asset, index) => {
    asset.id = asset.id || `gallery-${index}-${Date.now()}`;
    asset.id = String(asset.id);
    asset.order = asset.order ?? index;
    asset.filename = asset.filename || asset.src?.split("/").pop() || "";
  });
  render();
}

function normalizeContact(contact = {}, profile = {}) {
  const zhDefaults = {
    title: "有海报、电商、展会、目录或视频项目，可以先加微信沟通。",
    body: "告诉我你的项目目标、使用场景和交付时间，我会根据内容复杂度给出建议。",
    email: profile.email || "",
    phone: profile.phone || "",
    wechat: "",
    qrImage: "",
    note: "也可以通过邮箱先发送项目说明。",
  };
  const enDefaults = {
    title: "Have a project in mind? Send me an email.",
    body: "Share your goals, usage scenario and timeline. I will reply with practical suggestions based on the project scope.",
    email: "",
    note: "Email is the preferred contact method for English inquiries.",
  };
  const zh = {
    ...zhDefaults,
    title: contact.zh?.title || contact.title || zhDefaults.title,
    body: contact.zh?.body || contact.body || zhDefaults.body,
    email: contact.zh?.email || contact.email || zhDefaults.email,
    phone: contact.zh?.phone || contact.phone || zhDefaults.phone,
    wechat: contact.zh?.wechat || contact.wechat || "",
    qrImage: contact.zh?.qrImage || contact.qrImage || "",
    note: contact.zh?.note || contact.note || zhDefaults.note,
  };
  const en = {
    ...enDefaults,
    ...(contact.en || {}),
  };
  return {
    ...contact,
    ...zh,
    zh,
    en,
  };
}

function projectList() {
  return [...data.projects].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function articleList() {
  return [...data.articles].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function filteredGallery() {
  const search = gallerySearchTerm.trim().toLowerCase();
  return galleryBaseAssets(search)
    .filter(asset => matchesGalleryUsage(asset, galleryUsageFilter))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function galleryBaseAssets(search = gallerySearchTerm.trim().toLowerCase()) {
  const list = galleryFilter === "all"
    ? data.gallery
    : data.gallery.filter(asset => asset.chapter === galleryFilter);
  return list.filter(asset => matchesGallerySearch(asset, search));
}

function matchesGalleryUsage(asset, usage) {
  if (usage === "chapterCover") return asset.showInChapterCover === true;
  if (usage === "chapterStrip") return asset.showInChapterStrip === true;
  if (usage === "homeGallery") return asset.showOnHome === true;
  if (usage === "heroWall") return asset.showInHeroWall === true;
  return true;
}

function matchesGallerySearch(asset, search) {
  if (!search) return true;
  const haystack = [
    asset.filename,
    asset.title,
    asset.src,
    asset.chapter,
    chapterTitle(asset.chapter),
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search);
}

function galleryAssetId(asset) {
  return String(asset?.id || asset?.src || "");
}

function selectedGalleryAsset() {
  return filteredGallery()[currentGallery];
}

function isProtectedGalleryAsset(asset) {
  return Boolean(asset?.showInHeroWall || asset?.showOnHome || asset?.showInChapterCover || asset?.showInChapterStrip);
}

function pruneGallerySelection() {
  const validIds = new Set(data.gallery.map(galleryAssetId));
  [...selectedGalleryIds].forEach(id => {
    const asset = data.gallery.find(item => galleryAssetId(item) === id);
    if (!validIds.has(id) || isProtectedGalleryAsset(asset)) selectedGalleryIds.delete(id);
  });
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

  setHidden(document.getElementById("contentSidebar"), mode === "gallery" || mode === "settings");
  setHidden(document.getElementById("gallerySidebar"), mode !== "gallery");
  setHidden(projectForm, mode !== "projects");
  setHidden(articleForm, mode !== "articles");
  setHidden(settingsForm, mode !== "settings");
  setHidden(document.getElementById("galleryPanel"), mode !== "gallery");
  setHidden(document.getElementById("projectTools"), mode !== "projects");
  setHidden(document.getElementById("articleTools"), mode !== "articles");
  setHidden(document.getElementById("settingsTools"), mode !== "settings");
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
    document.getElementById("gallerySearchInput").value = gallerySearchTerm;
    renderGalleryUsageFilter();
    renderGalleryFilter();
    renderGalleryGrid();
    renderGalleryForm();
  }
  if (mode === "settings") {
    document.getElementById("editorMode").textContent = "Site Settings";
    document.getElementById("editorTitle").textContent = "首页设置";
    renderSettingsForm();
    document.getElementById("assetGrid").innerHTML = renderSettingsPreview();
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
  renderChapterAdminForm();
}

function selectedChapter() {
  return galleryFilter === "all" ? null : data.chapters.find(chapter => chapter.id === galleryFilter);
}

function renderChapterAdminForm() {
  const chapter = selectedChapter();
  const indexInput = document.getElementById("chapterIndexInput");
  const titleInput = document.getElementById("chapterTitleInput");
  const subtitleInput = document.getElementById("chapterSubtitleInput");
  const ratioInput = document.getElementById("chapterRatioInput");
  const summaryInput = document.getElementById("chapterSummaryInput");
  const deleteButton = document.getElementById("deleteChapterBtn");
  if (!indexInput || !titleInput || !subtitleInput) return;
  indexInput.value = chapter?.index || "";
  titleInput.value = chapter?.title || "";
  subtitleInput.value = chapter?.subtitle || "";
  if (ratioInput) ratioInput.value = chapter?.ratio || "";
  if (summaryInput) summaryInput.value = chapter?.summary || "";
  if (deleteButton) deleteButton.disabled = !chapter;
}

function chapterIdFromTitle(title) {
  const normalized = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `chapter-${Date.now()}`;
}

function renderGalleryUsageFilter() {
  const countBase = galleryBaseAssets();
  const filters = [
    { id: "all", label: "全部图片", count: countBase.length },
    { id: "chapterCover", label: "章节预览图", count: countBase.filter(asset => matchesGalleryUsage(asset, "chapterCover")).length },
    { id: "chapterStrip", label: "章节右侧图", count: countBase.filter(asset => matchesGalleryUsage(asset, "chapterStrip")).length },
    { id: "homeGallery", label: "首页图库", count: countBase.filter(asset => matchesGalleryUsage(asset, "homeGallery")).length },
    { id: "heroWall", label: "首屏动态图", count: countBase.filter(asset => matchesGalleryUsage(asset, "heroWall")).length },
  ];
  const homepageUsageLabels = {
    all: "全部图片",
    heroWall: "首屏动态图",
    chapterCover: "首页章节卡片背景图",
    chapterStrip: "首页章节卡片矩阵图",
    homeGallery: "底部图库展示",
  };
  filters.forEach(filter => {
    filter.label = homepageUsageLabels[filter.id] || filter.label;
  });
  const wrap = document.getElementById("galleryUsageFilter");
  wrap.innerHTML = filters.map(filter => `
    <button class="${galleryUsageFilter === filter.id ? "active" : ""}" type="button" data-usage="${filter.id}">
      <span>${escapeHtml(filter.label)}</span>
      <strong>${filter.count}</strong>
    </button>
  `).join("");
  wrap.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      commitGalleryForm();
      galleryUsageFilter = button.dataset.usage;
      currentGallery = 0;
      selectedGalleryIds.clear();
      render();
    });
  });
}

function renderGalleryGrid() {
  pruneGallerySelection();
  const assets = filteredGallery();
  const grid = document.getElementById("galleryAdminGrid");
  grid.innerHTML = assets.length ? assets.map((asset, index) => {
    const id = galleryAssetId(asset);
    const protectedAsset = isProtectedGalleryAsset(asset);
    const selected = selectedGalleryIds.has(id);
    const filename = asset.filename || asset.src?.split("/").pop() || "Media";
    return `
      <button class="gallery-admin-thumb ${index === currentGallery ? "active" : ""} ${selected ? "selected" : ""} ${protectedAsset ? "protected" : ""}" type="button" data-index="${index}" data-id="${escapeHtml(id)}" draggable="true">
        <img src="${escapeHtml(asset.src)}" alt="${escapeHtml(filename)}">
        <b>${protectedAsset ? "锁定" : selected ? "已选" : "选择"}</b>
        ${asset.showInHeroWall ? "<i class=\"badge-hero\">首屏</i>" : ""}
        ${asset.showOnHome ? "<i>首页</i>" : ""}
        ${asset.showInChapterCover ? "<i class=\"badge-cover\">封面</i>" : ""}
        ${asset.showInChapterStrip ? "<i class=\"badge-strip\">章节</i>" : ""}
        <span>${escapeHtml(chapterTitle(asset.chapter))}</span>
        <strong>${escapeHtml(filename)}</strong>
      </button>
    `;
  }).join("") : `<p class="empty-note">当前筛选条件下暂无图库图片。</p>`;

  grid.querySelectorAll(".gallery-admin-thumb").forEach(button => {
    button.addEventListener("click", () => {
      commitGalleryForm();
      currentGallery = Number(button.dataset.index);
      const id = button.dataset.id;
      const asset = filteredGallery()[currentGallery];
      if (isProtectedGalleryAsset(asset)) {
        selectedGalleryIds.delete(id);
        showStatus("这张图片已用于首页或章节展示，已自动取消选择，避免误删。", "error");
      } else if (selectedGalleryIds.has(id)) selectedGalleryIds.delete(id);
      else selectedGalleryIds.add(id);
      renderGalleryGrid();
      renderGalleryForm();
    });
    button.addEventListener("dragstart", event => {
      commitGalleryForm();
      draggedGalleryIndex = Number(button.dataset.index);
      button.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(draggedGalleryIndex));
    });
    button.addEventListener("dragend", () => {
      draggedGalleryIndex = -1;
      button.classList.remove("dragging");
    });
    button.addEventListener("dragover", event => {
      event.preventDefault();
      button.classList.add("drag-over");
    });
    button.addEventListener("dragleave", () => {
      button.classList.remove("drag-over");
    });
    button.addEventListener("drop", event => {
      event.preventDefault();
      button.classList.remove("drag-over");
      const fromIndex = Number(event.dataTransfer.getData("text/plain") || draggedGalleryIndex);
      const toIndex = Number(button.dataset.index);
      reorderVisibleGallery(fromIndex, toIndex);
    });
  });

  renderGallerySelectionState();
}

function renderGallerySelectionState() {
  pruneGallerySelection();
  const count = selectedGalleryIds.size;
  const resultCount = filteredGallery().length;
  const text = `已选择 ${count} 张图片`;
  const sidebarNote = document.getElementById("gallerySelectionNote");
  const selectionBar = document.getElementById("gallerySelectionBar");
  const deleteButton = document.getElementById("deleteSelectedGalleryBtn");

  if (sidebarNote) sidebarNote.textContent = text;
  if (selectionBar) {
    selectionBar.classList.toggle("has-selection", count > 0);
    selectionBar.querySelector("strong").textContent = text;
    selectionBar.querySelector("span").textContent = count > 0
      ? "请确认选中数量后再执行批量删除；锁定图片不会被删除。"
      : `当前筛选结果 ${resultCount} 张。点击图片可选择，拖动图片可调整排序。`;
  }
  if (deleteButton) {
    deleteButton.textContent = count > 0 ? `删除选中图片（${count}）` : "删除选中图片";
    deleteButton.disabled = count === 0;
  }
}

function reorderVisibleGallery(fromIndex, toIndex) {
  const assets = filteredGallery();
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || !assets[fromIndex] || !assets[toIndex]) return;
  const reordered = [...assets];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  reordered.forEach((asset, index) => {
    asset.order = index + 1;
  });
  currentGallery = toIndex;
  renderGalleryGrid();
  renderGalleryForm();
  showStatus("排序已更新，请记得保存或发布。");
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
  galleryForm.workSummary.value = asset.workSummary || "";
  galleryForm.showInHeroWall.checked = Boolean(asset.showInHeroWall);
  galleryForm.showOnHome.checked = Boolean(asset.showOnHome);
  galleryForm.showInChapterCover.checked = Boolean(asset.showInChapterCover);
  galleryForm.showInChapterStrip.checked = Boolean(asset.showInChapterStrip);
}

function renderSettingsForm() {
  const profile = data.profile || {};
  const contact = normalizeContact(data.contact || {}, profile);
  data.contact = contact;
  const zh = contact.zh || contact;
  const en = contact.en || {};
  settingsForm.heroImage.value = profile.heroImage || "";
  settingsForm.email.value = zh.email || profile.email || "";
  settingsForm.phone.value = zh.phone || profile.phone || "";
  settingsForm.wechat.value = zh.wechat || "";
  settingsForm.contactTitle.value = zh.title || "";
  settingsForm.contactBody.value = zh.body || "";
  settingsForm.qrImage.value = zh.qrImage || "";
  settingsForm.contactNote.value = zh.note || "";
  settingsForm.enEmail.value = en.email || "";
  settingsForm.enContactTitle.value = en.title || "";
  settingsForm.enContactBody.value = en.body || "";
  settingsForm.enContactNote.value = en.note || "";
}

function renderSettingsPreview() {
  const profile = data.profile || {};
  const contact = normalizeContact(data.contact || {}, profile);
  const zh = contact.zh || contact;
  return `
    ${profile.heroImage ? `<figure class="admin-cover-preview"><img src="${escapeHtml(profile.heroImage)}" alt="Banner"><figcaption>当前 Banner 大图</figcaption></figure>` : ""}
    ${zh.qrImage ? `<figure class="admin-cover-preview"><img src="${escapeHtml(zh.qrImage)}" alt="微信二维码"><figcaption>当前中文微信二维码</figcaption></figure>` : ""}
  `;
}

function commitCurrentForm() {
  if (!data) return;
  if (mode === "articles") commitArticleForm();
  else if (mode === "gallery") commitGalleryForm();
  else if (mode === "settings") commitSettingsForm();
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
  const workSummary = galleryForm.workSummary.value.trim();
  if (workSummary) asset.workSummary = workSummary;
  else delete asset.workSummary;
  asset.showInHeroWall = galleryForm.showInHeroWall.checked;
  asset.showOnHome = galleryForm.showOnHome.checked;
  asset.showInChapterCover = galleryForm.showInChapterCover.checked;
  asset.showInChapterStrip = galleryForm.showInChapterStrip.checked;
}

function commitSettingsForm() {
  data.profile = data.profile || {};
  data.contact = normalizeContact(data.contact || {}, data.profile);
  data.profile.heroImage = settingsForm.heroImage.value.trim();
  data.profile.email = settingsForm.email.value.trim();
  data.profile.phone = settingsForm.phone.value.trim();
  data.contact.zh = {
    email: settingsForm.email.value.trim(),
    phone: settingsForm.phone.value.trim(),
    wechat: settingsForm.wechat.value.trim(),
    title: settingsForm.contactTitle.value.trim(),
    body: settingsForm.contactBody.value.trim(),
    qrImage: settingsForm.qrImage.value.trim(),
    note: settingsForm.contactNote.value.trim(),
  };
  data.contact.en = {
    email: settingsForm.enEmail.value.trim(),
    title: settingsForm.enContactTitle.value.trim(),
    body: settingsForm.enContactBody.value.trim(),
    note: settingsForm.enContactNote.value.trim(),
  };
  Object.assign(data.contact, data.contact.zh);
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
  if (options.alertOnSuccess !== false) showStatus("正在保存草稿...", "loading");
  setActionBusy(true);
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
  if (options.alertOnSuccess !== false) showStatus("草稿保存成功。前台暂不更新，点击发布后才会更新。");
  setActionBusy(false);
  render();
}

async function publish() {
  showStatus("正在发布...", "loading");
  setActionBusy(true);
  await save({ alertOnSuccess: false });
  const res = await fetch("/api/publish", { method: "POST" });
  if (!res.ok) {
    setActionBusy(false);
    showStatus(res.status === 401 ? "登录已失效，请重新登录。" : "保存失败，请稍后重试。", "error");
    if (res.status === 401) alert("登录已失效，请重新登录。");
    throw new Error("发布失败");
  }
  alert("发布成功，前台已更新。");
}

async function saveWithStatus(options = {}) {
  const shouldNotify = options.alertOnSuccess !== false;
  try {
    if (options.showLoading !== false && shouldNotify) showStatus("正在保存草稿...", "loading");
    setActionBusy(true);
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
      if (res.status === 401) throw new Error("登录已失效，请重新登录。");
      throw new Error(await responseErrorMessage(res, "保存失败，请稍后重试。"));
    }
    if (shouldNotify) showStatus("草稿保存成功。前台暂不更新，点击发布后才会更新。");
    render();
    return true;
  } catch (error) {
    showStatus(error.message || "保存失败，请稍后重试。", "error");
    return false;
  } finally {
    if (!options.keepBusy) setActionBusy(false);
  }
}

async function publishWithStatus() {
  try {
    showStatus("正在发布...", "loading");
    setActionBusy(true);
    const saved = await saveWithStatus({ alertOnSuccess: false, showLoading: false, keepBusy: true });
    if (!saved) return false;
    const res = await fetch("/api/publish", { method: "POST" });
    if (!res.ok) {
      if (res.status === 401) throw new Error("登录已失效，请重新登录。");
      throw new Error(await responseErrorMessage(res, "发布失败，请稍后重试。"));
    }
    showStatus("发布成功，前台已更新。");
    return true;
  } catch (error) {
    showStatus(error.message || "发布失败，请稍后重试。", "error");
    return false;
  } finally {
    setActionBusy(false);
  }
}

save = saveWithStatus;
publish = publishWithStatus;

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
  if (isProtectedGalleryAsset(asset)) {
    selectedGalleryIds.delete(galleryAssetId(asset));
    alert("这张图片已用于首页图库、章节预览图或章节右侧展示。请先取消这些勾选，再删除图片。");
    render();
    return;
  }
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
  pruneGallerySelection();
  if (!selectedGalleryIds.size) {
    alert("请先在图片网格中选择要删除的图片。");
    return;
  }
  if (!confirm(`确定删除选中的 ${selectedGalleryIds.size} 张图库图片？`)) return;
  data.gallery = data.gallery.filter(asset => isProtectedGalleryAsset(asset) || !selectedGalleryIds.has(galleryAssetId(asset)));
  selectedGalleryIds.clear();
  currentGallery = 0;
  render();
  await save({ skipCommit: true });
});

document.getElementById("clearGallerySelectionBtn").addEventListener("click", () => {
  selectedGalleryIds.clear();
  renderGalleryGrid();
  renderGalleryForm();
  showStatus("已取消全部已选图片。");
});

document.getElementById("selectChapterGalleryBtn").addEventListener("click", () => {
  if (galleryFilter === "all") {
    alert("请先在左侧选择一个具体图库章节，再执行章节全选。");
    return;
  }
  data.gallery.filter(asset => asset.chapter === galleryFilter).forEach(asset => {
    const id = galleryAssetId(asset);
    if (isProtectedGalleryAsset(asset)) selectedGalleryIds.delete(id);
    else selectedGalleryIds.add(id);
  });
  renderGalleryGrid();
  renderGalleryForm();
});

document.getElementById("saveChapterBtn").addEventListener("click", () => {
  const chapter = selectedChapter();
  if (!chapter) {
    alert("请先选择一个具体章节，或点击新增章节。");
    return;
  }
  chapter.index = document.getElementById("chapterIndexInput").value.trim();
  chapter.title = document.getElementById("chapterTitleInput").value.trim() || "未命名章节";
  chapter.subtitle = document.getElementById("chapterSubtitleInput").value.trim();
  chapter.ratio = document.getElementById("chapterRatioInput")?.value.trim() || "";
  chapter.summary = document.getElementById("chapterSummaryInput")?.value.trim() || "";
  render();
  showStatus("章节已更新，请记得保存或发布。");
});

document.getElementById("addChapterBtn").addEventListener("click", () => {
  const title = document.getElementById("chapterTitleInput").value.trim() || "新的图库章节";
  const baseId = chapterIdFromTitle(title);
  let nextId = baseId;
  let counter = 2;
  while (data.chapters.some(chapter => chapter.id === nextId)) {
    nextId = `${baseId}-${counter}`;
    counter += 1;
  }
  data.chapters.push({
    id: nextId,
    index: document.getElementById("chapterIndexInput").value.trim() || String(data.chapters.length + 1).padStart(2, "0"),
    title,
    subtitle: document.getElementById("chapterSubtitleInput").value.trim(),
    ratio: document.getElementById("chapterRatioInput")?.value.trim() || "",
    summary: document.getElementById("chapterSummaryInput")?.value.trim() || "",
    keywords: [],
  });
  galleryFilter = nextId;
  currentGallery = 0;
  selectedGalleryIds.clear();
  render();
  showStatus("新章节已添加，请记得保存或发布。");
});

document.getElementById("deleteChapterBtn").addEventListener("click", () => {
  const chapter = selectedChapter();
  if (!chapter) return;
  if (data.chapters.length <= 1) {
    alert("至少需要保留一个图库章节。");
    return;
  }
  const affectedCount = data.gallery.filter(asset => asset.chapter === chapter.id).length;
  const fallback = data.chapters.find(item => item.id !== chapter.id);
  if (!confirm(`确定删除章节「${chapter.title}」？该章节下 ${affectedCount} 张图片会移动到「${fallback.title}」，图片文件不会被删除。`)) return;
  data.gallery.forEach(asset => {
    if (asset.chapter === chapter.id) asset.chapter = fallback.id;
  });
  data.projects.forEach(project => {
    if (project.chapter === chapter.id) project.chapter = fallback.id;
  });
  data.chapters = data.chapters.filter(item => item !== chapter);
  galleryFilter = fallback.id;
  currentGallery = 0;
  selectedGalleryIds.clear();
  render();
  showStatus("章节已删除，图片已移动到其他章节，请记得保存或发布。");
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

document.getElementById("gallerySearchInput").addEventListener("input", event => {
  commitGalleryForm();
  gallerySearchTerm = event.target.value;
  currentGallery = 0;
  selectedGalleryIds.clear();
  renderGalleryGrid();
  renderGalleryForm();
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

settingsForm.addEventListener("input", () => {
  commitSettingsForm();
  document.getElementById("assetGrid").innerHTML = renderSettingsPreview();
});

document.getElementById("heroImageInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const uploaded = await uploadImage(file);
  data.profile.heroImage = uploaded.src;
  settingsForm.heroImage.value = uploaded.src;
  document.getElementById("assetGrid").innerHTML = renderSettingsPreview();
  event.target.value = "";
});

document.getElementById("qrImageInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const uploaded = await uploadImage(file);
  data.contact = normalizeContact(data.contact || {}, data.profile || {});
  data.contact.qrImage = uploaded.src;
  data.contact.zh.qrImage = uploaded.src;
  settingsForm.qrImage.value = uploaded.src;
  document.getElementById("assetGrid").innerHTML = renderSettingsPreview();
  event.target.value = "";
});

setupAdminForHomepageLayout();
checkSession();
