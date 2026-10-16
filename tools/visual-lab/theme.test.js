"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),schema=require("./schema"),defaults=require("./defaults.json");
test("light preset removes all legacy darkening and keeps palette application explicit",()=>{
  const v=schema.backgroundValues({theme:"light"});
  assert.equal(v.color,"#ffffff");assert.equal(v.imageVisible,false);assert.equal(v.gradientVisible,false);
  assert.equal(v.maskVisible,false);assert.equal(v.ambientStrength,0);assert.equal(v.lightBlend,"multiply");
  assert.equal(v.palette,"original");assert.equal(v.componentAdapt,true);
  assert.equal(schema.backgroundValues({theme:"dark",palette:"light"}).palette,"light");
  assert.equal(schema.backgroundValues({theme:"light",palette:"dark"}).palette,"dark");
});
test("different mobile theme cannot inherit desktop black masks; image geometry and palette remain",()=>{
  const d=structuredClone(defaults);
  d.desktop.background={theme:"dark",maskVisible:true,horizontalOpacity:.9,color:"#090908",scale:1.4,palette:"dark"};
  d.mobile.background={theme:"light"};
  const p=schema.resolveOverrides(d,390,"zh").background,v=schema.backgroundValues(p);
  assert.equal(v.maskVisible,false);assert.equal(v.color,"#ffffff");assert.equal(v.horizontalOpacity,.12);
  assert.equal(v.scale,1.4);assert.equal(v.palette,"dark");
  assert.equal(schema.backgroundValues(schema.resolveOverrides(d,1440,"zh").background).maskVisible,true);
});
test("layer switches remain independent and false/zero are preserved",()=>{
  const d=structuredClone(defaults);
  d.desktop.background={theme:"light",imageVisible:true,gradientVisible:true,lightVisible:false,maskVisible:false,lightStrength:0,ambientStrength:0};
  assert.equal(schema.validateBackgroundDesign(d).ok,true);
  const v=schema.backgroundValues(schema.resolveOverrides(d,768,"en").background);
  assert.equal(v.imageVisible,true);assert.equal(v.gradientVisible,true);assert.equal(v.lightVisible,false);
  assert.equal(v.maskVisible,false);assert.equal(v.lightStrength,0);
  d.desktop.background.lightBlend="overlay";assert.equal(schema.validateBackgroundDesign(d).ok,false);
  d.desktop.background.lightBlend="multiply";d.desktop.background.imageVisible="false";
  assert.equal(schema.validateBackgroundDesign(d).ok,false);
});
test("custom snapshots can preserve light settings and same-theme mobile fields still inherit",()=>{
  const d=structuredClone(defaults),v=schema.backgroundValues({theme:"light",palette:"light"});
  d.desktop.background={...v,theme:"custom"};
  d.mobile.background={lightStrength:.35};
  assert.equal(schema.validateBackgroundDesign(d).ok,true);
  const mobile=schema.backgroundValues(schema.resolveOverrides(d,390,"en").background);
  assert.equal(mobile.color,"#ffffff");assert.equal(mobile.imageVisible,false);
  assert.equal(mobile.lightStrength,.35);assert.equal(mobile.palette,"light");
  assert.deepEqual(schema.resolveOverrides(defaults,390,"zh"),{});
});
