"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const schema=require("./schema");
const defaults=require("./defaults.json");
test("bridge preserves render, applies background only, and validates parent/origin/session",async()=>{
  const messages=[],events=[],listeners={};
  const parent={postMessage:(message,origin)=>messages.push({message,origin})};
  const originalPortfolio={profile:{title:"Original"}};
  let renderCount=0;
  const applied=[];
  const context={
    parent,location:{origin:"http://127.0.0.1:4185"},innerWidth:390,
    document:{currentScript:{dataset:{session:"a".repeat(48)}}},
    portfolio:originalPortfolio,currentLang:"zh",render:()=>{renderCount++;return "preserved";},
    requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    window:{parent,FeirooSchema:schema,FeirooBackground:{capture(){},apply:(p,url)=>applied.push({p,url})},addEventListener:(type,fn)=>listeners[type]=fn,
      dispatchEvent:event=>events.push(event)}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("./preview-bridge"),"utf8"),context);
  const send=(data,origin=context.location.origin,source=parent)=>listeners.message({data:{channel:"feiroo.visualLab.v1",session:"a".repeat(48),...data},origin,source});
  assert.equal(messages[0].message.type,"ready");
  const initialCount=messages.length;
  send({type:"hello"},"https://evil.test");
  send({type:"hello"},context.location.origin,{});
  send({type:"initialize",design:defaults,language:"en",requestId:1,session:"wrong"});
  assert.equal(messages.length,initialCount);
  assert.equal(context.currentLang,"zh");
  const changed=structuredClone(defaults);changed.base.title={opacity:0};
  send({type:"initialize",design:changed,language:"en",requestId:1});
  assert.equal(messages.at(-1).message.type,"error");
  assert.equal(renderCount,0);
  send({type:"initialize",design:defaults,language:"en",requestId:1});
  assert.equal(context.currentLang,"en");
  assert.equal(renderCount,1);
  assert.equal(context.render(),"preserved");
  assert.equal(events.at(-1).type,"feiroo-lab:render");
  send({type:"set-language",language:"zh",requestId:0});
  assert.equal(context.currentLang,"en");
  send({type:"set-language",language:"zh",requestId:2});
  assert.equal(context.currentLang,"zh");
  assert.deepEqual(originalPortfolio,{profile:{title:"Original"}});
  assert.ok(messages.every(m=>m.origin===context.location.origin));
  const background=structuredClone(defaults);background.desktop.background={brightness:1.2,opacity:0};
  send({type:"set-design",design:background,assetUrls:{},requestId:3});
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.deepEqual(applied.at(-1).p,{brightness:1.2,opacity:0});
  const count=applied.length;
  send({type:"set-design",design:background,assetUrls:{bad:"https://evil.test/a.jpg"},requestId:4});
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(messages.at(-1).message.type,"error");
  assert.equal(applied.length,count);
  send({type:"set-design",design:defaults,assetUrls:{},requestId:5});
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(Object.keys(applied.at(-1).p).length,0);
  const pending={};
  context.Image=class {
    constructor(){this.naturalWidth=100;this.naturalHeight=100;}
    decode(){return new Promise(resolve=>pending[this.src]=resolve);}
  };
  const assets=structuredClone(defaults);
  for(const id of ["first","second"])assets.assets[id]={source:"local",path:"assets/"+id+".png",mime:"image/png",bytes:100,sha256:"a".repeat(64)};
  const runtime={first:"blob:http://127.0.0.1:4185/first",second:"blob:http://127.0.0.1:4185/second"};
  assets.desktop.background={mode:"image",assetId:"first"};
  send({type:"set-design",design:structuredClone(assets),assetUrls:runtime,requestId:6});
  await new Promise(resolve=>setTimeout(resolve,10));
  assets.desktop.background.assetId="second";
  send({type:"set-design",design:structuredClone(assets),assetUrls:runtime,requestId:7});
  await new Promise(resolve=>setTimeout(resolve,10));
  pending[runtime.second]();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(applied.at(-1).p.assetId,"second");
  const latest=applied.length;
  pending[runtime.first]();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(applied.length,latest,"stale image decode cannot overwrite the latest revision");
  assets.assets.third={source:"local",path:"assets/third.png",mime:"image/png",bytes:100,sha256:"b".repeat(64)};
  assets.desktop.background={assetId:"third",imageVisible:true};
  runtime.third="blob:http://127.0.0.1:4185/third";
  send({type:"set-design",design:structuredClone(assets),assetUrls:runtime,requestId:8});
  await new Promise(resolve=>setTimeout(resolve,10));
  assets.desktop.background.imageVisible=false;
  send({type:"set-design",design:structuredClone(assets),assetUrls:runtime,requestId:9});
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(applied.at(-1).p.imageVisible,false,"hiding an image does not wait for pending decode");
  const hiddenCount=applied.length;pending[runtime.third]();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(applied.length,hiddenCount);
});
