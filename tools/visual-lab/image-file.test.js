"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const images=require("./image-file"),schema=require("./schema");
test("real project JPEG preflight and invalid/animated/oversized files",()=>{
  const bytes=new Uint8Array(fs.readFileSync(path.join(__dirname,"../../public/assets/gallery/product-marketing/0015-16-2x.jpg")));
  const result=images.inspect(bytes,"image/jpeg");assert.equal(result.mime,"image/jpeg");assert.ok(result.width>0);
  assert.throws(()=>images.inspect(bytes,"image/png"),/不一致/);
  assert.throws(()=>images.inspect(new Uint8Array(25)),/真实/);
  assert.throws(()=>images.inspect(new Uint8Array(20971521)),/20 MB/);
  assert.throws(()=>images.dimensions(16385,1),/尺寸/);
  assert.throws(()=>images.dimensions(6000,6000),/尺寸/);
  const png=new Uint8Array(45),view=new DataView(png.buffer);
  png.set([137,80,78,71,13,10,26,10]);view.setUint32(8,13);png.set([73,72,68,82],12);
  view.setUint32(16,100);view.setUint32(20,100);view.setUint32(33,0);png.set([97,99,84,76],37);
  assert.throws(()=>images.inspect(png),/动画/);
});
test("phase two accepts zero background overrides, rejects unrelated edits and invalid filter ranges",()=>{
  const defaults=require("./defaults.json"),d=structuredClone(defaults);
  d.desktop.background={opacity:0,brightness:0,blur:24,lightStrength:0,imageShadeOpacity:0};
  assert.equal(schema.validateBackgroundDesign(d).ok,true);
  d.mobile.title={opacity:0};assert.equal(schema.validateBackgroundDesign(d).ok,false);delete d.mobile.title;
  d.desktop.background.blur=25;assert.equal(schema.validateBackgroundDesign(d).ok,false);
});
