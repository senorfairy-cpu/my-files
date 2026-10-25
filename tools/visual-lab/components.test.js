"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const schema=require("./schema"),pack=require("./design-package"),lights=require("./lights"),defaults=require("./defaults.json");
const fresh=()=>({...structuredClone(defaults),lighting:lights.create()});
test("component contract deeply inherits per-image fields and independently scopes mobile surfaces without allowing layout or buttons",()=>{
  const d=fresh();d.desktop.wall={x:42,density:.7,images:{a:{opacity:.8,brightness:1.2},b:{saturation:.3,zIndex:9}}};d.mobile.wall={x:0,images:{a:{opacity:0}}};d.desktop.mark={backgroundOpacity:.8,radius:{value:22,unit:"px"}};d.mobile.mark={blur:0};
  assert.equal(schema.validateComponentDesign(d).ok,true);const w=schema.resolveOverrides(d,390,"en");assert.deepEqual(w.wall.images,{a:{opacity:0,brightness:1.2},b:{saturation:.3,zIndex:9}});assert.equal(w.wall.x,0);assert.equal(w.mark.backgroundOpacity,.8);assert.equal(w.mark.blur,0);
  delete d.mobile.wall;assert.equal(schema.resolveOverrides(d,390,"zh").wall.x,42);assert.equal(schema.validateLabDesign(d).ok,false);
  for(const edit of [x=>x.base.layout={minHeight:{value:800,unit:"px"}},x=>x.base.primary={opacity:1},x=>x.base.wall={rotation:10},x=>x.base.mark={width:{value:200,unit:"px"}},x=>x.base.mark={radius:{value:30,unit:"%"}},x=>x.base.wall={images:{a:{zIndex:1.5}}},x=>x.base.wall={images:{a:{brightness:3}}},x=>x.base.wall={images:JSON.parse('{"__proto__":{"opacity":0}}')},x=>x.base.wall={density:0}]){const bad=fresh();edit(bad);assert.equal(schema.validateComponentDesign(bad).ok,false);}
});
test("v3 ZIP preserves wall images, card surfaces, languages, text, background bytes and lights; v1/v2 remain readable",async()=>{
  const d=fresh(),bytes=fs.readFileSync(require("node:path").join(__dirname,"../../public/assets/gallery/product-marketing/0015-16-2x.jpg")),hash=require("node:crypto").createHash("sha256").update(bytes).digest("hex"),id="image_"+hash;
  d.assets[id]={source:"local",path:"assets/"+hash+".jpg",mime:"image/jpeg",bytes:bytes.length,sha256:hash};d.desktop.background={theme:"light",assetId:id};d.content.zh.title="保留文字";d.content.en.title="Keep text";d.desktop.wall={density:.5,images:{"asset-0023":{zIndex:10,brightness:1.4}}};d.mobile.wall={images:{"asset-0023":{saturation:0}}};d.mobile.mark={blur:0,shadowStrength:0,backgroundOpacity:0};d.lighting.sources.main.mobile={x:68};
  const r={format:"feiroo.visual-lab",version:3,name:"照片墙验收",createdAt:new Date().toISOString(),view:{language:"en",width:390},design:d,extensions:{}};
  const out=await pack.decode(await pack.encode(r,{[id]:new Blob([bytes])}));assert.deepEqual(out.record,r);assert.deepEqual(Buffer.from(await out.blobs[id].arrayBuffer()),bytes);
  for(const version of [1,2]){const old={...r,version,design:fresh()};if(version===2)old.design.content.zh.title="v2文字";assert.deepEqual((await pack.decode(await pack.encode(old,{}))).record,old);assert.throws(()=>pack.validate({...r,version}),/参数不兼容/);}
});
function fixture(){
  function element(){const values=new Map(),attributes=new Set();return {values,attributes,hidden:false,style:{getPropertyValue:k=>values.get(k)||"",getPropertyPriority:()=>"",setProperty:(k,v)=>values.set(k,String(v)),removeProperty:k=>values.delete(k)},toggleAttribute(k,on){if(on)attributes.add(k);else attributes.delete(k);},contains(node){return node===this;}};}
  const wall=element(),mark=element(),figures=[element(),element()],images=[element(),element()],label={};let theme="dark";
  wall.querySelectorAll=()=>figures;wall.contains=n=>n===wall||figures.includes(n)||images.includes(n);mark.contains=n=>n===mark||n===label;
  figures.forEach((figure,i)=>{figure.querySelector=()=>images[i];figure.contains=n=>n===figure||n===images[i];images[i].alt="Picture "+(i+1);});
  for(const img of images)img.matches=selector=>selector===".hero-wall img"||(selector===".light .hero-wall img"&&theme==="light");
  const filterRule=(selector,value)=>({selectorText:selector,style:{getPropertyValue:key=>key==="filter"?value:""},cssRules:[]});
  const listeners={},document={getElementById:()=>wall,querySelector:()=>mark,addEventListener:(name,fn)=>listeners[name]=fn,styleSheets:[{cssRules:[filterRule(".hero-wall img","saturate(0.88) contrast(1.03) brightness(0.84)"),filterRule(".light .hero-wall img","saturate(0.95) contrast(1.03)")]}]};
  function computed(el){const get=k=>el.values.get(k),index=figures.indexOf(el);return {filter:get("filter")||(images.includes(el)?(theme==="light"?"saturate(0.95) contrast(1.03)":"saturate(0.88) contrast(1.03) brightness(0.84)"):"none"),getPropertyValue:k=>get(k)||(k==="--wall-x"?index*106+"%":""),zIndex:get("z-index")||String(index+1),display:"block",backgroundColor:get("background-color")||(theme==="light"?"rgba(255, 255, 255, 0.86)":"rgba(35, 18, 9, 0.34)"),backgroundImage:get("background-image")||"radial-gradient(circle, rgba(255, 255, 255, 0.12), transparent 36%)",borderTopLeftRadius:get("border-radius")||"18px",boxShadow:get("box-shadow")||"rgba(0, 0, 0, 0.28) 0px 18px 48px 0px, rgba(255, 255, 255, 0.09) 0px 1px 0px 0px inset",backdropFilter:get("backdrop-filter")||"blur(18px)"};}
  const context={window:{FeirooSchema:schema},document,getComputedStyle:computed};vm.runInNewContext(fs.readFileSync(require.resolve("./components-preview"),"utf8"),context);const api=context.window.FeirooComponents;api.capture([{id:"a",title:"A"},{id:"b",title:"B"}]);return{wall,mark,figures,images,listeners,label,api,theme:value=>theme=value};
}
test("empty component overrides restore the exact original inline state and never write transform, transition or animation opacity",()=>{
  const f=fixture(),d=fresh();f.api.apply(d,1440,"zh");for(const el of [f.wall,f.mark,...f.figures,...f.images])assert.equal(el.values.size,0);
  d.desktop.wall={x:40,y:-20,scale:1.3,opacity:.6,density:.5,images:{a:{opacity:.4,brightness:1.4,saturation:.5,zIndex:12}}};d.desktop.mark={backgroundOpacity:.8,radius:{value:28,unit:"px"},blur:5,shadowStrength:.5};f.api.apply(d,1440,"zh");
  assert.equal(f.wall.values.get("translate"),"40px -20px");assert.equal(f.wall.values.get("scale"),"1.3");assert.equal(f.figures[1].values.get("--wall-x"),"53%");assert.equal(f.figures[0].values.get("z-index"),"12");assert.match(f.images[0].values.get("filter"),/brightness\(0.84\).*brightness\(1.4\).*saturate\(0.5\)/);
  for(let i=0;i<20;i++)f.api.apply(d,1440,"zh");assert.equal((f.images[0].values.get("filter").match(/brightness\(1.4\)/g)||[]).length,1,"repeated live updates must never compound filters");
  for(const el of [f.wall,f.mark,...f.figures])for(const key of ["transform","opacity","transition","animation"])assert.equal(el.values.has(key),false);
  delete d.desktop.wall;delete d.desktop.mark;f.api.apply(d,1440,"zh");for(const el of [f.wall,f.mark,...f.figures,...f.images])assert.equal(el.values.size,0);
});
test("card background opacity never dims labels; shadow/blur respect light and dark defaults, including zero",()=>{
  const f=fixture(),d=fresh();d.desktop.mark={backgroundOpacity:0,shadowStrength:0,blur:0};f.api.apply(d,1440,"zh");assert.equal(f.mark.values.get("background-color"),"rgba(35,18,9,0)");assert.equal(f.mark.values.get("backdrop-filter"),"blur(0px)");assert.doesNotMatch(f.mark.values.get("box-shadow"),/0\.28|0\.09/);assert.equal(f.mark.values.has("opacity"),false);
  f.theme("light");d.desktop.mark={backgroundOpacity:.5,shadowStrength:2};f.api.apply(d,390,"en");assert.equal(f.mark.values.get("background-color"),"rgba(255,255,255,0.5)");assert.match(f.mark.values.get("box-shadow"),/0\.56/);delete d.desktop.mark;const state=f.api.apply(d,390,"en");assert.equal(state.mark.backgroundOpacity,.86);assert.equal(f.mark.values.size,0);
});
test("theme and language rerenders read CSSStyleRule declarations even with empty nesting lists, never the previous composited filter",()=>{
  const f=fixture(),d=fresh();d.desktop.wall={images:{a:{brightness:1.5,saturation:.6}}};
  for(let i=0;i<10;i++)for(const theme of ["dark","light"]){f.theme(theme);f.api.restore();f.api.capture([{id:"a",title:"A"},{id:"b",title:"B"}]);f.api.apply(d,390,i%2?"en":"zh");const filter=f.images[0].values.get("filter");assert.equal(filter,(theme==="light"?"saturate(0.95) contrast(1.03)":"saturate(0.88) contrast(1.03) brightness(0.84)")+" brightness(1.5) saturate(0.6)");}
});
test("per-image restoration isolates neighbors; density and layer changes preserve nodes and unavailable image data",()=>{
  const f=fixture(),d=fresh(),order=[...f.figures];d.desktop.wall={density:.6,images:{a:{opacity:0},b:{brightness:1.5},missing:{opacity:.2}}};let state=f.api.apply(d,390,"zh");assert.equal(f.images[0].values.get("opacity"),"0");assert.deepEqual([...state.missingImages],["missing"]);
  delete d.desktop.wall.images.a;f.api.apply(d,390,"en");assert.equal(f.images[0].values.has("opacity"),false);assert.match(f.images[1].values.get("filter"),/brightness\(1.5\)/);assert.ok(Math.abs(parseFloat(f.figures[1].values.get("--wall-x"))-63.6)<.001);assert.deepEqual(f.figures,order);
});
test("real image and card click selection identifies stable source IDs without reordering or replacing content",()=>{
  const f=fixture(),messages=[];f.api.connect((type,payload)=>messages.push({type,payload}));f.listeners.click({target:f.images[1]});assert.equal(messages.at(-1).payload.imageId,"b");assert.equal(f.figures[1].attributes.has("data-feiroo-component-selected"),true);f.listeners.click({target:f.label});assert.equal(messages.at(-1).payload.id,"mark");f.listeners.click({target:f.wall});assert.equal(messages.at(-1).payload.imageId,null);f.listeners.keydown({key:"Escape"});assert.equal(f.wall.attributes.size,0);assert.equal(f.mark.attributes.size,0);
});
