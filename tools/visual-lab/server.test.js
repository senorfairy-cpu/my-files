"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const {createLabServer}=require("./server");
test("dedicated loopback service isolates seed, preview injection, methods and filesystem",async t=>{
  const server=createLabServer();
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const port=server.address().port;
  assert.equal(server.address().address,"127.0.0.1");
  function request(route,headers={},method="GET") {
    return new Promise((resolve,reject)=>{
      const req=http.request({hostname:"127.0.0.1",port,path:route,headers,method},res=>{
        const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString(),headers:res.headers}));
      });req.on("error",reject);req.end();
    });
  }
  const home=await request("/");
  assert.equal(home.status,200);
  assert.equal(home.body,fs.readFileSync(path.join(__dirname,"../../public/index.html"),"utf8"));
  const preview=await request("/?visualLab=1");
  assert.equal(preview.status,200);
  assert.match(preview.body,/preview-bridge.js/);
  assert.match(preview.body,/data-session="[a-f0-9]{48}"/);
  assert.ok(preview.body.indexOf('/app.js')<preview.body.indexOf('preview-bridge.js'));
  assert.ok(preview.body.indexOf('background-adapter.js')<preview.body.indexOf('preview-bridge.js'));
  assert.ok(preview.body.indexOf('lights.js')<preview.body.indexOf('schema.js'));
  assert.ok(preview.body.indexOf('lights-preview.js')<preview.body.indexOf('preview-bridge.js'));
  assert.match(preview.headers["content-security-policy"],/img-src 'self' data: blob:/);
  assert.equal((await request("/__visual-lab/")).status,200);
  assert.equal((await request("/__visual-lab/schema.js")).status,200);
  assert.deepEqual(JSON.parse((await request("/api/portfolio")).body),require("../../data/portfolio.json"));
  for(const route of ["/api/save","/api/session","/admin.html","/.netlify/functions/api/portfolio","/api/upload"])
    assert.equal((await request(route)).status,403,route);
  for(const method of ["POST","PUT","PATCH","DELETE","OPTIONS"])
    assert.equal((await request("/api/portfolio",{},method)).status,405);
  assert.equal((await request("/",{host:"evil.test:"+port})).status,403);
  assert.equal((await request("/",{origin:"https://evil.test"})).status,403);
  assert.equal((await request("/",{"sec-fetch-site":"cross-site"})).status,403);
  for(const route of ["/__visual-lab/../../server.js","/%2e%2e%2fserver.js","/data/portfolio.json","/.git/config","/__visual-lab/server.js"])
    assert.notEqual((await request(route)).status,200,route);
  assert.equal((await request("/%ZZ")).status,400);
  assert.equal((await request("/missing-file.png")).status,404);
  assert.equal((await request("/",{},"HEAD")).body,"");
});
