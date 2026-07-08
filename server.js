const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const dataFile = path.join(root, "data", "portfolio.json");
const uploadDir = path.join(publicDir, "assets", "uploads");
const port = Number(process.env.PORT || 4173);
const adminPassword = process.env.PORTFOLIO_ADMIN_PASSWORD || "admin123";
const sessions = new Set();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
  });
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "")
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf("=");
      return index >= 0 ? [part.slice(0, index), decodeURIComponent(part.slice(index + 1))] : [part, ""];
    }));
}

function isAuthed(req) {
  const token = parseCookies(req).portfolio_admin;
  return Boolean(token && sessions.has(token));
}

function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  send(res, 401, JSON.stringify({ error: "Unauthorized" }));
  return false;
}

function sessionToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function staticFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(publicDir, cleanPath));
  if (!filePath.startsWith(publicDir)) return send(res, 403, "Forbidden", "text/plain");
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain");
    send(res, 200, data, types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url.startsWith("/api/session")) {
      return send(res, 200, JSON.stringify({ ok: isAuthed(req) }));
    }
    if (req.method === "POST" && req.url.startsWith("/api/login")) {
      const body = await readBody(req);
      const data = JSON.parse(body || "{}");
      if (data.password !== adminPassword) {
        return send(res, 401, JSON.stringify({ error: "Invalid password" }));
      }
      const token = sessionToken();
      sessions.add(token);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": `portfolio_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`,
      });
      return res.end(JSON.stringify({ ok: true }));
    }
    if (req.method === "POST" && req.url.startsWith("/api/logout")) {
      const token = parseCookies(req).portfolio_admin;
      if (token) sessions.delete(token);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": "portfolio_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
      return res.end(JSON.stringify({ ok: true }));
    }
    if (req.method === "GET" && req.url.startsWith("/api/portfolio")) {
      return send(res, 200, fs.readFileSync(dataFile));
    }
    if (req.method === "POST" && req.url.startsWith("/api/portfolio")) {
      if (!requireAuth(req, res)) return;
      const body = await readBody(req);
      const data = JSON.parse(body);
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf-8");
      return send(res, 200, JSON.stringify({ ok: true }));
    }
    if (req.method === "POST" && req.url.startsWith("/api/upload")) {
      if (!requireAuth(req, res)) return;
      const body = await readBody(req);
      const data = JSON.parse(body);
      const match = /^data:(image\/(?:png|jpeg|jpg|gif));base64,(.+)$/.exec(data.dataUrl || "");
      if (!match) return send(res, 400, JSON.stringify({ error: "Unsupported image data" }));
      const ext = match[1].includes("png") ? ".png" : match[1].includes("gif") ? ".gif" : ".jpg";
      const safe = String(data.name || "upload").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 48);
      fs.mkdirSync(uploadDir, { recursive: true });
      const fileName = `${Date.now()}-${safe}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
      return send(res, 200, JSON.stringify({ src: `/assets/uploads/${fileName}` }));
    }
    return staticFile(req, res);
  } catch (error) {
    return send(res, 500, JSON.stringify({ error: error.message }));
  }
});

server.listen(port, () => {
  console.log(`Portfolio site: http://localhost:${port}`);
  console.log(`Admin panel:    http://localhost:${port}/admin.html`);
});
