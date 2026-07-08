async function loadProject() {
  const res = await fetch("/api/portfolio").catch(() => fetch("/data/portfolio.json"));
  const data = await res.json();
  const id = new URLSearchParams(location.search).get("id") || data.projects[0]?.id;
  const project = data.projects.find(item => item.id === id) || data.projects[0];
  const profile = data.profile;

  document.title = `${project.title} - ${profile.name}`;
  const assets = project.assets || [];
  const group = project.group || project.category || "Selected Work";

  document.getElementById("projectDetail").innerHTML = `
    <section class="detail-hero">
      <div class="detail-cover"><img src="${project.cover}" alt="${project.title}"></div>
      <div class="detail-copy">
        <p class="eyebrow">${group} / ${project.year}</p>
        <h1>${project.title}</h1>
        <p class="lead">${project.summary}</p>
        <dl>
          <div><dt>Role</dt><dd>${project.role || "-"}</dd></div>
          <div><dt>Category</dt><dd>${project.category || "-"}</dd></div>
          <div><dt>Tags</dt><dd>${(project.tags || []).join(" / ")}</dd></div>
        </dl>
      </div>
    </section>
    <section class="detail-grid">
      ${assets.map((asset, index) => `
        <figure class="${index === 0 || index === 3 ? "wide" : ""}">
          <img src="${asset.src}" alt="${project.title}">
        </figure>
      `).join("")}
    </section>
  `;
}

loadProject();
