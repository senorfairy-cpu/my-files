const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleApi } = require("./netlify/functions/portfolio-api");

const root = __dirname;
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4173);

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

function staticFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pagePath = url.pathname === "/blog"
    ? "/blog.html"
    : url.pathname === "/article"
      ? "/article.html"
      : url.pathname;
  const cleanPath = decodeURIComponent(pagePath === "/" ? "/index.html" : pagePath);
  const filePath = path.normalize(path.join(publicDir, cleanPath));
  if (!filePath.startsWith(publicDir)) return send(res, 403, "Forbidden", "text/plain");
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain");
    send(res, 200, data, types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  });
}

async function apiRequest(req, res) {
  const body = await readBody(req);
  const result = await handleApi({
    path: req.url.split("?")[0],
    httpMethod: req.method,
    headers: req.headers,
    body,
    isBase64Encoded: false,
  });
  const headers = { ...result.headers };
  const cookie = headers["Set-Cookie"];
  delete headers["Set-Cookie"];
  if (cookie) res.setHeader("Set-Cookie", cookie);
  res.writeHead(result.statusCode, headers);
  res.end(result.isBase64Encoded ? Buffer.from(result.body, "base64") : result.body);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) return apiRequest(req, res);
    return staticFile(req, res);
  } catch (error) {
    return send(res, 500, JSON.stringify({ error: error.message }));
  }
});

server.listen(port, () => {
  console.log(`Portfolio site: http://localhost:${port}`);
  console.log(`Admin panel:    http://localhost:${port}/admin.html`);
});
