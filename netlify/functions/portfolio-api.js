const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const localUploadDir = path.join(root, "public", "assets", "uploads");
const isNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_DEV);
const adminPassword = process.env.PORTFOLIO_ADMIN_PASSWORD || "admin123";
const sessionSecret = process.env.PORTFOLIO_SESSION_SECRET || adminPassword;
const sessionMaxAge = 60 * 60 * 24;

const imageTypes = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const seedDataFiles = [
  path.join(root, "data", "portfolio.json"),
  path.join(process.cwd(), "data", "portfolio.json"),
  path.join(__dirname, "data", "portfolio.json"),
  path.join(__dirname, "portfolio.json"),
];
const localDraftFile = path.join(root, "data", "portfolio.draft.json");

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function text(statusCode, body, type = "text/plain; charset=utf-8", headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store",
      ...headers,
    },
    body,
  };
}

function binary(statusCode, body, type) {
  return {
    statusCode,
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: Buffer.from(body).toString("base64"),
    isBase64Encoded: true,
  };
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(String(cookieHeader)
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf("=");
      return index >= 0 ? [part.slice(0, index), decodeURIComponent(part.slice(index + 1))] : [part, ""];
    }));
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function createSessionCookie() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const value = String(issuedAt);
  return `${value}.${sign(value)}`;
}

function isAuthed(headers = {}) {
  const cookieHeader = headers.cookie || headers.Cookie || "";
  const token = parseCookies(cookieHeader).portfolio_admin;
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature || sign(issuedAt) !== signature) return false;
  const age = Math.floor(Date.now() / 1000) - Number(issuedAt);
  return Number.isFinite(age) && age >= 0 && age <= sessionMaxAge;
}

function sessionCookie(token, maxAge = sessionMaxAge) {
  return `portfolio_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function bodyJson(event) {
  if (!event.body) return {};
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;
  return JSON.parse(body || "{}");
}

function normalizePath(event) {
  const raw = event.path || event.rawUrl || "/";
  const urlPath = raw.split("?")[0];
  return urlPath
    .replace(/^\/api/, "")
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/+/, "/") || "/";
}

async function blobStore() {
  if (!isNetlify) return null;
  const { getStore } = require("@netlify/blobs");
  return getStore("portfolio-site");
}

function readSeedPortfolio() {
  const seedFile = seedDataFiles.find(file => fs.existsSync(file));
  if (!seedFile) throw new Error("Missing initial data/portfolio.json");
  return JSON.parse(fs.readFileSync(seedFile, "utf-8"));
}

async function readPortfolio(key = "portfolio.json") {
  const store = await blobStore();
  if (store) {
    const saved = await store.get(key, { type: "json" });
    if (saved) return saved;
  }
  if (key === "portfolio-draft.json" && fs.existsSync(localDraftFile)) {
    return JSON.parse(fs.readFileSync(localDraftFile, "utf-8"));
  }
  return readSeedPortfolio();
}

async function writePortfolio(data, key = "portfolio.json") {
  const store = await blobStore();
  if (store) {
    await store.set(key, JSON.stringify(data), {
      metadata: { contentType: "application/json; charset=utf-8" },
    });
    return;
  }
  const dataFile = key === "portfolio-draft.json" ? localDraftFile : seedDataFiles[0];
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf-8");
}

async function readDraftPortfolio() {
  const store = await blobStore();
  if (store) {
    const draft = await store.get("portfolio-draft.json", { type: "json" });
    if (draft) return draft;
    return readPortfolio("portfolio.json");
  }
  if (fs.existsSync(localDraftFile)) {
    return JSON.parse(fs.readFileSync(localDraftFile, "utf-8"));
  }
  return readPortfolio("portfolio.json");
}

async function writeDraftPortfolio(data) {
  return writePortfolio(data, "portfolio-draft.json");
}

async function publishDraftPortfolio() {
  const draft = await readDraftPortfolio();
  await writePortfolio(draft, "portfolio.json");
  return draft;
}

function safeUploadName(name = "upload") {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^a-z0-9_-]+/gi, "-").slice(0, 48) || "upload";
  return `${Date.now()}-${base}${imageTypes[ext] ? ext : ".jpg"}`;
}

async function saveImage(name, buffer, type) {
  const store = await blobStore();
  const fileName = safeUploadName(name);
  if (store) {
    const key = `uploads/${fileName}`;
    await store.set(key, buffer, {
      metadata: { contentType: type },
    });
    return `/api/media/${encodeURIComponent(fileName)}`;
  }

  fs.mkdirSync(localUploadDir, { recursive: true });
  fs.writeFileSync(path.join(localUploadDir, fileName), buffer);
  return `/assets/uploads/${fileName}`;
}

async function readImage(fileName) {
  const cleanName = path.basename(decodeURIComponent(fileName || ""));
  const type = imageTypes[path.extname(cleanName).toLowerCase()] || "application/octet-stream";
  const store = await blobStore();
  if (store) {
    const data = await store.get(`uploads/${cleanName}`, { type: "arrayBuffer" });
    return data ? { data: Buffer.from(data), type } : null;
  }
  const filePath = path.join(localUploadDir, cleanName);
  if (!filePath.startsWith(localUploadDir) || !fs.existsSync(filePath)) return null;
  return { data: fs.readFileSync(filePath), type };
}

async function handleApi(event) {
  const method = event.httpMethod || event.method || "GET";
  const apiPath = normalizePath(event);

  if (method === "GET" && apiPath === "/session") {
    return json(200, { ok: isAuthed(event.headers) });
  }

  if (method === "POST" && apiPath === "/login") {
    const data = bodyJson(event);
    if (data.password !== adminPassword) return json(401, { error: "Invalid password" });
    return json(200, { ok: true }, {
      "Set-Cookie": sessionCookie(createSessionCookie()),
    });
  }

  if (method === "POST" && apiPath === "/logout") {
    return json(200, { ok: true }, {
      "Set-Cookie": sessionCookie("", 0),
    });
  }

  if (method === "GET" && apiPath === "/portfolio") {
    return json(200, await readPortfolio());
  }

  if (method === "POST" && apiPath === "/portfolio") {
    if (!isAuthed(event.headers)) return json(401, { error: "Unauthorized" });
    await writeDraftPortfolio(bodyJson(event));
    return json(200, { ok: true, draft: true });
  }

  if (method === "GET" && apiPath === "/draft") {
    if (!isAuthed(event.headers)) return json(401, { error: "Unauthorized" });
    return json(200, await readDraftPortfolio());
  }

  if (method === "POST" && apiPath === "/draft") {
    if (!isAuthed(event.headers)) return json(401, { error: "Unauthorized" });
    await writeDraftPortfolio(bodyJson(event));
    return json(200, { ok: true, draft: true });
  }

  if (method === "POST" && apiPath === "/publish") {
    if (!isAuthed(event.headers)) return json(401, { error: "Unauthorized" });
    await publishDraftPortfolio();
    return json(200, { ok: true });
  }

  if (method === "POST" && apiPath === "/upload") {
    if (!isAuthed(event.headers)) return json(401, { error: "Unauthorized" });
    const data = bodyJson(event);
    const match = /^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,(.+)$/.exec(data.dataUrl || "");
    if (!match) return json(400, { error: "Unsupported image data" });
    const src = await saveImage(data.name, Buffer.from(match[2], "base64"), match[1]);
    return json(200, { src });
  }

  if (method === "GET" && apiPath.startsWith("/media/")) {
    const image = await readImage(apiPath.slice("/media/".length));
    if (!image) return text(404, "Not found");
    return binary(200, image.data, image.type);
  }

  return json(404, { error: "Not found" });
}

module.exports = { handleApi };
