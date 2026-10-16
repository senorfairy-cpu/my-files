"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname,"../..");
const publicDir=path.join(root,"public");
const labDir=__dirname;
const staticNames=new Set(["design-package.js","drafts.js","storage-panel.js","lights.js","lights-panel.js","lights-preview.js","panel.css","panel.js","schema.js","defaults.json","preview-bridge.js","preview.css","background-adapter.js","image-file.js","diagnostics.js","diagnostic.html","diagnostic-child.html"]);
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
  ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",
  ".avif":"image/avif",".gif":"image/gif",".svg":"image/svg+xml",".pdf":"application/pdf",
  ".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf",".otf":"font/otf",".ico":"image/x-icon"};
function createLabServer() {
  const session=crypto.randomBytes(24).toString("hex");
  return http.createServer((req,res)=>{
    const origin="http://127.0.0.1:"+req.socket.localPort;
    const headers={
      "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"no-referrer","X-Frame-Options":"SAMEORIGIN",
      "Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'none'"
    };
    function send(status,body,type="text/plain; charset=utf-8") {
      res.writeHead(status,{...headers,"Content-Type":type});
      res.end(req.method==="HEAD"?undefined:body);
    }
    try {
      if (req.headers.host !== "127.0.0.1:"+req.socket.localPort ||
          (req.headers.origin && req.headers.origin!==origin) ||
          req.headers["sec-fetch-site"]==="cross-site") return send(403,"Local origin required");
      if (!["GET","HEAD"].includes(req.method)) return send(405,"Read-only preview");
      const url=new URL(req.url,origin);
      let pathname;
      try {pathname=decodeURIComponent(url.pathname);} catch {return send(400,"Invalid path encoding");}
      if (pathname.includes("\\") || pathname.includes("\0")) return send(400,"Invalid path");
      if (pathname==="/api/portfolio") {
        return send(200,fs.readFileSync(path.join(root,"data/portfolio.json")),types[".json"]);
      }
      if (pathname.startsWith("/api/") || pathname.startsWith("/.netlify/") ||
          /^\/admin(?:[./]|$)/.test(pathname)) return send(403,"Admin and cloud routes disabled");
      if (pathname==="/__visual-lab" ) {
        res.writeHead(302,{...headers,Location:"/__visual-lab/"}); return res.end();
      }
      if (pathname==="/__visual-lab/") return send(200,fs.readFileSync(path.join(labDir,"index.html")),types[".html"]);
      if (pathname.startsWith("/__visual-lab/")) {
        const name=pathname.slice("/__visual-lab/".length);
        if (!staticNames.has(name)) return send(404,"Not found");
        return send(200,fs.readFileSync(path.join(labDir,name)),types[path.extname(name)]);
      }
      const mapped=pathname==="/" ? "/index.html" : pathname==="/blog" ? "/blog.html" :
        pathname==="/article" ? "/article.html" : pathname;
      const candidate=path.resolve(publicDir,"."+mapped);
      const relative=path.relative(publicDir,candidate);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return send(403,"Forbidden");
      let actual;
      try {actual=fs.realpathSync(candidate);} catch {return send(404,"Not found");}
      const realRelative=path.relative(fs.realpathSync(publicDir),actual);
      if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) return send(403,"Forbidden");
      if (!fs.statSync(actual).isFile()) return send(404,"Not found");
      let body=fs.readFileSync(actual);
      // The dedicated service alone injects the bridge, after the untouched app.js.
      if (mapped==="/index.html" && url.searchParams.get("visualLab")==="1") {
        const injection='<link rel="stylesheet" href="/__visual-lab/preview.css">' +
          '<script src="/__visual-lab/lights.js"></script><script src="/__visual-lab/schema.js"></script>' +
          '<script src="/__visual-lab/background-adapter.js"></script><script src="/__visual-lab/lights-preview.js"></script><script src="/__visual-lab/preview-bridge.js" data-session="'+session+'"></script>';
        body=Buffer.from(body.toString("utf8").replace("</body>",injection+"</body>"));
      }
      send(200,body,types[path.extname(actual)] || "application/octet-stream");
    } catch (error) {
      console.error("Visual Lab request failed:",error.code || error.name);
      if (!res.headersSent) send(500,"Local preview unavailable");
      else res.end();
    }
  });
}
if (require.main===module) {
  const port=Number(process.env.LAB_PORT || 4185);
  if (!Number.isInteger(port) || port<1024 || port>65535) throw new Error("LAB_PORT must be 1024–65535");
  const server=createLabServer();
  server.on("error",error=>{console.error("Visual Lab could not start:",error.code);process.exitCode=1;});
  server.listen(port,"127.0.0.1",()=>console.log("FEIROO Visual Lab: http://127.0.0.1:"+port+"/__visual-lab/"));
}
module.exports={createLabServer};
