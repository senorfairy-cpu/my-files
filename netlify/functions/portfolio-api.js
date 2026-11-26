// Production legacy-data recovery. READ ONLY, no migration and no filesystem fallback.
const crypto=require('crypto'),path=require('path');
const EXPECTED_SITE_ID='8cd1208d-730b-4fed-bd11-259d7b61e3a2';
const adminPassword=process.env.PORTFOLIO_ADMIN_PASSWORD;
const sessionSecret=process.env.PORTFOLIO_SESSION_SECRET || adminPassword;
const sessionMaxAge=60*60*24;
const imageTypes={'.gif':'image/gif','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
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
  if (!sessionSecret) return false;
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


function fail(code,stage,extra={}) { return Object.assign(new Error(code),{safe:true,status:503,code,stage,...extra}); }
function valid(data) {
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!object(data)||!object(data.profile)||!object(data.contact)||['projects','gallery','chapters','articles','stats'].some(k=>!Array.isArray(data[k])||data[k].some(x=>!object(x)))||data.gallery.some(x=>typeof x.src!=='string'||!x.src))throw fail('BLOBS_DATA_INVALID','blobs-validate');
 return data;
}
function httpStatus(error) {
 const direct=Number(error.status||error.statusCode||error.response?.status);
 if(direct>=400&&direct<=599)return direct;
 const match=/\((\d{3}) status code\)/.exec(String(error.message));return match?Number(match[1]):null;
}
function errorResponse(error) {
 return json(503,{error:'真实作品数据暂时无法读取，已停止操作；不会使用旧图库。',code:error.safe?error.code:'STORAGE_UNAVAILABLE',stage:error.safe?error.stage:'request',...(error.safe&&error.upstreamStatus?{upstreamStatus:error.upstreamStatus}:{})},{'X-Portfolio-Writes-Enabled':'false'});
}
async function loadBlobsSdk(loadCommonJS=()=>require('@netlify/blobs'),loadESM=()=>import('@netlify/blobs')) {
 let sdk;
 try{sdk=loadCommonJS();}
 catch{
  // Preserve the production baseline's ESM fallback; both loaders refer only to the installed SDK.
  try{sdk=await loadESM();}catch{throw fail('BLOBS_SDK_UNAVAILABLE','sdk-load');}
 }
 if(typeof sdk?.getStore!=='function'&&sdk?.default)sdk=sdk.default;
 if(typeof sdk?.getStore!=='function'||typeof sdk?.connectLambda!=='function'||typeof sdk?.setEnvironmentContext!=='function')throw fail('BLOBS_SDK_UNAVAILABLE','sdk-exports');
 return sdk;
}
async function openStore(event) {
 const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
 const reported=headers['x-nf-site-id'];
 if(reported&&reported!==EXPECTED_SITE_ID)throw fail('BLOBS_SITE_MISMATCH','site-check');
 const sdk=await loadBlobsSdk();
 // Each request gets its own captured store; never inherit a prior invocation's credentials.
 sdk.setEnvironmentContext({});
 let mode,store;
 if(event.blobs){
  if(reported!==EXPECTED_SITE_ID)throw fail('BLOBS_SITE_MISMATCH','site-check');
  try{sdk.connectLambda({...event,headers});store=sdk.getStore({name:'portfolio-site',consistency:'eventual'});mode='auto';}
  catch{throw fail('BLOBS_CONTEXT_INVALID','blobs-context');}
 }else{
  const siteID=process.env.NETLIFY_SITE_ID||process.env.SITE_ID||process.env.BLOBS_SITE_ID;
  const token=process.env.NETLIFY_AUTH_TOKEN||process.env.NETLIFY_BLOBS_TOKEN||process.env.BLOBS_TOKEN;
  if(!siteID||!token)throw fail('BLOBS_CONTEXT_MISSING','blobs-context');
  if(siteID!==EXPECTED_SITE_ID)throw fail('BLOBS_SITE_MISMATCH','site-check');
  try{store=sdk.getStore({name:'portfolio-site',consistency:'eventual',siteID,token});mode='manual';}
  catch{throw fail('BLOBS_CONTEXT_INVALID','blobs-context');}
 }
 async function read(key,type='json'){
  const stage=key==='portfolio.json'?'blobs-read-published':key==='portfolio-draft.json'?'blobs-read-draft':'blobs-read-media';
  try{return await store.get(key,{type,consistency:'eventual'});}
  catch(error){const status=httpStatus(error);throw fail(status===401||status===403?'BLOBS_AUTH_FAILED':'BLOBS_READ_FAILED',stage,{mode,upstreamStatus:status});}
 }
 return {mode,read}; // Intentionally no set/delete/initialize/migration capability.
}
async function handleApi(event) {
 const method=event.httpMethod||'GET',route=normalizePath(event);
 if(method==='GET'&&route==='/session')return json(200,{ok:isAuthed(event.headers)});
 if(method==='POST'&&route==='/login'){
  if(!adminPassword||!sessionSecret)throw fail('ADMIN_CONFIG_MISSING','admin-config');
  let body;try{body=bodyJson(event);}catch{return json(400,{error:'请求格式无效。'});}
  if(body.password!==adminPassword)return json(401,{error:'Invalid password'});
  return json(200,{ok:true},{'Set-Cookie':sessionCookie(createSessionCookie())});
 }
 if(method==='POST'&&route==='/logout')return json(200,{ok:true},{'Set-Cookie':sessionCookie('',0)});
 if(['/draft','/blob-status'].includes(route)&&!isAuthed(event.headers))return json(401,{error:'Unauthorized'});
 if(method!=='GET')return json(423,{error:'当前修复版本为只读；保存、发布和上传均关闭。',code:'READ_ONLY'},{'X-Portfolio-Writes-Enabled':'false'});
 if(!['/portfolio','/draft','/blob-status'].includes(route)&&!route.startsWith('/media/'))return json(404,{error:'Not found'});
 let storage;
 try{
  storage=await openStore(event);
  if(route==='/blob-status'){
   const data=await storage.read('portfolio.json');if(data===null)throw fail('PUBLISHED_MISSING','blobs-read-published');valid(data);
   return json(200,{available:true,mode:storage.mode,siteMatches:true,writesEnabled:false,publishedPresent:true,counts:{projects:data.projects.length,gallery:data.gallery.length,chapters:data.chapters.length,articles:data.articles.length},error:null});
  }
  if(route==='/portfolio'){
   const data=await storage.read('portfolio.json');if(data===null)throw fail('PUBLISHED_MISSING','blobs-read-published');
   return json(200,valid(data),{'X-Portfolio-Writes-Enabled':'false','X-Portfolio-Data-Source':'blobs'});
  }
  if(route==='/draft'){
   let data=await storage.read('portfolio-draft.json');
   // A genuinely absent draft may inherit the real published document; a failed read never does.
   if(data===null)data=await storage.read('portfolio.json');
   if(data===null)throw fail('PUBLISHED_MISSING','blobs-read-published');valid(data);
   const payload=Buffer.from(JSON.stringify({v:'legacy-readonly',revision:crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'),expires:Math.floor(Date.now()/1000)+sessionMaxAge})).toString('base64url');
   return json(200,data,{'X-Portfolio-Read-Proof':payload+'.'+sign('readonly:'+payload),'X-Portfolio-Writes-Enabled':'false','X-Portfolio-Data-Source':'blobs'});
  }
  const name=decodeURIComponent(route.slice('/media/'.length));
  if(!name||name!==path.basename(name)||name.includes('\\'))return json(400,{error:'Invalid image path'});
  const data=await storage.read('uploads/'+name,'arrayBuffer');
  return data===null?text(404,'Not found'):binary(200,data,imageTypes[path.extname(name).toLowerCase()]||'application/octet-stream');
 }catch(error){
  if(route==='/blob-status')return json(200,{available:false,writesEnabled:false,mode:storage?.mode||error.mode||null,code:error.safe?error.code:'STORAGE_UNAVAILABLE',stage:error.safe?error.stage:'request',upstreamStatus:error.safe?error.upstreamStatus||null:null,error:'真实Blobs读取失败；没有使用旧图库。'});
  throw error;
 }
}
module.exports={handleApi,errorResponse};
