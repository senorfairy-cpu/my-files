"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const schema=require("./schema");
const defaults=require("./defaults.json");
const fresh=()=>structuredClone(defaults);
test("original preset inherits all adaptive styles; returned state is independent",()=>{
  assert.equal(schema.validateDesign(defaults).ok,true);
  for(const lang of ["zh","en"]) for(const width of [320,390,680,681,1440])
    assert.deepEqual(schema.resolveOverrides(defaults,width,lang),{});
});
test("mobile inherits desktop, 0 opacity survives, locale has final precedence",()=>{
  const d=fresh();d.base.title={opacity:1};d.desktop.title={weight:400};
  d.mobile.title={opacity:0};d.localeStyles.en.title={weight:700};
  assert.deepEqual(schema.resolveOverrides(d,680,"en"),{title:{opacity:0,weight:700}});
  assert.deepEqual(schema.resolveOverrides(d,681,"zh"),{title:{opacity:1,weight:400}});
});
test("unknown fields, scripts/CSS, invalid dimensions, versions, ranges and references rejected",()=>{
  const invalid=[
    d=>d.schemaVersion=2,d=>d.baseCommit="wrong",d=>d.extra={},
    d=>d.mobile.title={opacity:2},d=>d.desktop.title={fontSize:"calc(100vw)"},
    d=>d.desktop.title={fontSize:{unit:"px",value:NaN}},
    d=>d.content.zh={title:{}},d=>d.content.en={href:"https://example.com"},
    d=>d.base.background={assetId:"missing"},d=>d.base.title={onclick:"alert(1)"},
    d=>d.mobile.title={opacity:Infinity},d=>d.desktop={constructor:{}},
    d=>d.base=JSON.parse('{"__proto__":{"opacity":0}}'),
    d=>d.assets={bad:{source:"local",path:"assets/../secret",mime:"image/png",bytes:1,sha256:"a".repeat(64)}}
  ];
  for(const edit of invalid){const d=fresh();edit(d);assert.equal(schema.validateDesign(d).ok,false);}
  for(const d of [null,[],{},42]) assert.equal(schema.validateDesign(d).ok,false);
});
test("structured dimensions and future package limits are explicit",()=>{
  const d=fresh();d.base.layout={minHeight:{unit:"vh",value:70}};
  assert.equal(schema.validateDesign(d).ok,true);
  assert.equal(schema.PACKAGE_LIMITS.maxFileBytes,20971520);
  assert.equal(schema.PACKAGE_LIMITS.maxZipBytes,104857600);
  assert.equal(schema.PACKAGE_LIMITS.maxUnpackedBytes,104857600);
  assert.equal(schema.PACKAGE_LIMITS.maxEntries,100);
});
