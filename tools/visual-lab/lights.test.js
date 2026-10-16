"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),m=require("./lights"),schema=require("./schema"),defaults=require("./defaults.json");
test("original orange source and optional model preserve old designs",()=>{
 const r=m.create();assert.equal(m.validate(r).ok,true);assert.equal(m.isOriginal(r),true);
 assert.equal(m.resolve(r,1440)[0].color,"#ff8026");assert.equal(m.resolve(r,390)[0].width,56);
 const d=structuredClone(defaults);assert.equal(schema.validateDesign(d).ok,true);d.lighting=r;assert.equal(schema.validateBackgroundDesign(d).ok,true);
});
test("source roster, copies and order are shared; deleting removes both device states",()=>{
 const r=m.create();m.add(r,"blue",m.COLORS.blue,true);
 assert.equal(r.sources.blue.defaults.blend,"multiply");r.sources.blue.desktop.x=12;r.sources.blue.mobile.x=85;
 m.duplicate(r,"blue","copy");assert.equal(r.sources.copy.mobile.x,85);assert.equal(r.sources.copy.desktop.x,12);
 r.sources.copy.mobile.x=70;assert.equal(r.sources.blue.mobile.x,85);
 m.move(r,"main",1);assert.deepEqual(r.order,["blue","main","copy"]);
 m.remove(r,"blue");assert.equal(Object.hasOwn(r.sources,"blue"),false);
 assert.equal(m.resolve(r,390).some(s=>s.id==="blue"),false);assert.equal(m.validate(r).ok,true);
});
test("common to desktop to mobile inheritance and scoped reset do not desynchronize IDs",()=>{
 const r=m.create();r.sources.main.base.x=30;r.sources.main.desktop.x=40;r.sources.main.mobile.x=75;
 assert.equal(m.resolve(r,1440)[0].x,40);assert.equal(m.resolve(r,390)[0].x,75);
 m.reset(r,"main","mobile");assert.equal(m.resolve(r,390)[0].x,40);
 m.reset(r,"main","desktop");assert.equal(m.resolve(r,390)[0].x,30);
 m.reset(r,"main","base");assert.equal(m.isOriginal(r),true);
});
test("five-source limit, empty roster, illegal IDs and data are rejected or supported explicitly",()=>{
 const r=m.create();for(let i=1;i<5;i++)m.add(r,"light"+i,m.COLORS.green,false);
 assert.throws(()=>m.add(r,"six",m.COLORS.purple),/5/);assert.throws(()=>m.duplicate(r,"main","six"),/5/);
 r.sources.main.mobile.blend="difference";assert.equal(m.validate(r).ok,false);delete r.sources.main.mobile.blend;
 r.sources.main.mobile.width=0;assert.equal(m.validate(r).ok,false);delete r.sources.main.mobile.width;
 r.order.push("missing");assert.equal(m.validate(r).ok,false);
 const empty=m.create();m.remove(empty,"main");assert.equal(m.validate(empty).ok,true);assert.deepEqual(m.resolve(empty,390),[]);
});
test("percentage positions remain correct under scaled rects, scrolling and off-center grabs",()=>{
 for(const scale of [.5,.8,1,1.25,2]){
   const rect={left:123*scale,top:-75*scale,width:1000*scale,height:600*scale};
   assert.deepEqual(m.position(rect,rect.left+rect.width*.7,rect.top+rect.height*.4),{x:70,y:40});
   assert.deepEqual(m.position(rect,rect.left+rect.width*.7,rect.top+rect.height*.4,2,-3),{x:72,y:37});
 }
 assert.deepEqual(m.position({left:10,top:20,width:375,height:580},-200,5000),{x:0,y:100});
 assert.throws(()=>m.position({left:0,top:0,width:0,height:500},10,10),/geometry/);
});
test("theme or language changes cannot mutate the separate source model",()=>{
 const d=structuredClone(defaults);d.lighting=m.create();d.lighting.sources.main.mobile.color="#22aaff";
 const before=JSON.stringify(d.lighting);for(const theme of ["dark","light","custom"]){d.desktop.background={theme};schema.resolveOverrides(d,390,"en");schema.resolveOverrides(d,1440,"zh");assert.equal(JSON.stringify(d.lighting),before);}
});
