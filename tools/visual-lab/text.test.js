"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
const schema=require("./schema"),pack=require("./design-package"),defaults=require("./defaults.json"),lights=require("./lights");
const fresh=()=>({...structuredClone(defaults),lighting:lights.create()});
test("phase 3.1 accepts text only, preserves independent languages and sparse mobile inheritance including zero",()=>{
  const d=fresh();d.content.zh.title="中文标题";d.content.en.title="English title";
  d.desktop.title={fontSize:{value:60,unit:"px"},font:"judou",opacity:.8};d.mobile.title={fontSize:{value:32,unit:"px"},opacity:0};
  assert.equal(schema.validateLabDesign(d).ok,true);
  assert.equal(schema.resolveOverrides(d,390,"zh").title.opacity,0);
  assert.equal(schema.resolveOverrides(d,1440,"en").title.fontSize.value,60);
  delete d.mobile.title;assert.equal(schema.resolveOverrides(d,390,"zh").title.fontSize.value,60);
  for(const edit of [x=>x.desktop.primary={opacity:.8},x=>x.content.zh.primary="no buttons",x=>x.desktop.title={offsetX:10},x=>x.desktop.title={fontSize:{value:0,unit:"px"}},x=>x.desktop.title={fontSize:{value:40,unit:"vh"}},x=>x.desktop.title={font:"remote-font"}]){const bad=fresh();edit(bad);assert.equal(schema.validateLabDesign(bad).ok,false);}
});
test("v2 text packages round trip both languages, widths and lights; v1 stays readable and cannot silently contain text",async()=>{
  const design=fresh();design.content.zh={title:"跨设备文字",intro:"第一行\n第二行"};design.content.en={title:"Portable typography"};design.desktop.title={color:"#12345678",weight:800};design.mobile.intro={lineHeight:1.7,maxWidth:{value:90,unit:"%"}};
  const bytes=fs.readFileSync(require("node:path").join(__dirname,"../../public/assets/gallery/product-marketing/0015-16-2x.jpg")),hash=require("node:crypto").createHash("sha256").update(bytes).digest("hex"),id="image_"+hash;
  design.assets[id]={source:"local",path:"assets/"+hash+".jpg",mime:"image/jpeg",bytes:bytes.length,sha256:hash};design.desktop.background={assetId:id,theme:"light"};design.lighting.sources.main.mobile={x:68};
  const r={format:"feiroo.visual-lab",version:2,name:"文字与背景",createdAt:new Date().toISOString(),view:{language:"en",width:390},design,extensions:{}};
  const decoded=await pack.decode(await pack.encode(r,{[id]:new Blob([bytes])}));assert.deepEqual(decoded.record,r);assert.deepEqual(Buffer.from(await decoded.blobs[id].arrayBuffer()),bytes);
  const v1={...r,version:1,design:fresh()};assert.deepEqual((await pack.decode(await pack.encode(v1,{}))).record,v1);
  assert.throws(()=>pack.validate({...r,version:1}),/参数不兼容/);
  const other=structuredClone(r);other.design.content.en.title="Changed English";assert.equal(r.design.content.zh.title,"跨设备文字");
});
function fixture(){
  const nodes={},listeners={};
  for(const id of schema.textIds){const values=new Map(),priorities=new Map();nodes[id]={textContent:id+" zh",clientWidth:520,attrs:new Set(),style:{getPropertyValue:k=>values.get(k)||"",getPropertyPriority:k=>priorities.get(k)||"",setProperty(k,v,p=""){values.set(k,String(v));priorities.set(k,p);},removeProperty:k=>values.delete(k)},toggleAttribute(k,on){if(on)this.attrs.add(k);else this.attrs.delete(k);},contains(x){return x===this;},values};}
  const context={window:{FeirooSchema:schema},document:{querySelector:s=>nodes[schema.textIds.find(id=>schema.objects[id].selector===s)],addEventListener:(type,fn)=>listeners[type]=fn},getComputedStyle:el=>({fontSize:el.style.getPropertyValue("font-size")||"60px",fontWeight:el.style.getPropertyValue("font-weight")||"800",lineHeight:el.style.getPropertyValue("line-height")?String(Number(el.style.getPropertyValue("line-height"))*60):"57.6px",letterSpacing:el.style.getPropertyValue("letter-spacing")||"normal",color:el.style.getPropertyValue("color")||"rgb(255, 244, 232)",maxWidth:el.style.getPropertyValue("max-width")||"700px",textAlign:el.style.getPropertyValue("text-align")||"left",filter:el.style.getPropertyValue("filter")||"none"})};
  vm.runInNewContext(fs.readFileSync(require.resolve("./text-preview"),"utf8"),context);return{nodes,listeners,api:context.window.FeirooText};
}
test("default restores original inline styles and text exactly; edit opacity composes without touching animation properties or other objects",()=>{
  const {nodes,api}=fixture();nodes.title.style.setProperty("font-size","58px","important");api.capture("zh");const d=fresh();
  api.apply(d,1440,"zh");assert.equal(nodes.title.textContent,"title zh");assert.equal(nodes.title.style.getPropertyValue("font-size"),"58px");assert.equal(nodes.title.style.getPropertyPriority("font-size"),"important");
  d.content.zh.title="<script>plain text</script>";d.desktop.title={fontSize:{value:64,unit:"px"},opacity:0,color:"#123456",align:"center"};api.apply(d,1440,"zh");
  assert.equal(nodes.title.textContent,"<script>plain text</script>");assert.equal(nodes.title.style.getPropertyValue("filter"),"opacity(0)");
  assert.equal(nodes.title.style.getPropertyValue("opacity"),"");assert.equal(nodes.title.style.getPropertyValue("transform"),"");assert.equal(nodes.intro.values.size,0);
  delete d.content.zh.title;delete d.desktop.title;api.apply(d,1440,"zh");assert.equal(nodes.title.textContent,"title zh");assert.equal(nodes.title.style.getPropertyValue("filter"),"");assert.equal(nodes.title.style.getPropertyValue("font-size"),"58px");
});
test("language re-render recaptures source content; reset one object never resets other text, background or lights",()=>{
  const {nodes,api}=fixture(),d=fresh();api.capture("zh");d.content.zh.title="中文";d.desktop.intro={color:"#abcdef"};d.desktop.background={brightness:1.2};const before=structuredClone(d.lighting);api.apply(d,390,"zh");
  for(const id of schema.textIds)nodes[id].textContent=id+" en";api.capture("en");api.apply(d,390,"en");assert.equal(nodes.title.textContent,"title en");
  d.content.en.title="English";api.apply(d,390,"en");assert.equal(nodes.title.textContent,"English");api.apply(d,390,"zh");assert.equal(nodes.title.textContent,"中文");
  delete d.content.zh.title;api.apply(d,390,"zh");assert.equal(nodes.title.textContent,"title zh");assert.equal(d.desktop.intro.color,"#abcdef");assert.equal(d.desktop.background.brightness,1.2);assert.deepEqual(d.lighting,before);
});
test("preview text clicks select only registered text; Escape clears outline without replacing nodes",()=>{
  const {nodes,api,listeners}=fixture(),messages=[];api.capture("zh");api.connect((type,data)=>messages.push({type,data}));listeners.click({target:nodes.intro});assert.equal(messages.at(-1).data.id,"intro");
  assert.equal(nodes.intro.attrs.has("data-feiroo-text-selected"),true);listeners.click({target:{}});assert.equal(messages.length,1);listeners.keydown({key:"Escape"});assert.equal(nodes.intro.attrs.size,0);assert.equal(messages.at(-1).type,"text-selection-exit");
});
