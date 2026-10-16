'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pack=require('./design-package'),defaults=require('./defaults.json'),lights=require('./lights');
function record(){return{format:'feiroo.visual-lab',version:1,name:'迁移验收',createdAt:new Date().toISOString(),view:{width:390,language:'en'},design:{...structuredClone(defaults),lighting:lights.create()},extensions:{}};}
const data=fs.readFileSync(path.join(__dirname,'../../public/assets/gallery/product-marketing/0015-16-2x.jpg')),hash=crypto.createHash('sha256').update(data).digest('hex'),id='image_'+hash;
function sample(){const r=record();r.design.assets[id]={source:'local',path:'assets/'+hash+'.jpg',mime:'image/jpeg',bytes:data.length,sha256:hash};r.design.desktop.background={theme:'light',assetId:id,opacity:.3};r.design.mobile.background={theme:'custom',positionX:23,scale:1.4};r.design.lighting.sources.main.mobile={x:32};return r;}
test('package round trip retains every field, device inheritance, language, light and actual bytes without original blob URLs',async()=>{
  const r=sample(),blob=await pack.encode(r,{[id]:new Blob([data])}),out=await pack.decode(blob);
  assert.deepEqual(out.record,r);assert.deepEqual(Buffer.from(await out.blobs[id].arrayBuffer()),data);assert.equal(Object.keys(out.blobs).length,1);
  for(const theme of ['dark','light','custom']){r.design.desktop.background.theme=theme;assert.deepEqual((await pack.decode(await pack.encode(r,{[id]:new Blob([data])}))).record,r);}
});
test('bad versions, unknown future fields, wrong baseline and missing or spoofed assets are rejected without mutating source',async()=>{
  const r=sample(),before=structuredClone(r);await assert.rejects(pack.encode(r,{}),/素材/);assert.deepEqual(r,before);
  await assert.rejects(pack.encode(r,{[id]:new Blob([Buffer.alloc(data.length)])}),/真实|校验/);assert.deepEqual(r,before);
  for(const change of [x=>x.version=2,x=>x.extensions.future={},x=>x.design.baseCommit='a'.repeat(40),x=>x.view.language='fr',x=>x.design.future={}]){const bad=structuredClone(r);change(bad);assert.throws(()=>pack.validate(bad));}
});
test('ZIP rejects CRC corruption, truncation, traversal, scripts, duplicate entries, oversized archives and incomplete manifests',async()=>{
  const raw=new Uint8Array(await(await pack.encode(sample(),{[id]:new Blob([data])})).arrayBuffer());
  const damaged=raw.slice();damaged[50]^=1;assert.throws(()=>pack.unzip(damaged));assert.throws(()=>pack.unzip(raw.slice(0,-1)));
  for(const p of ['../manifest.json','assets/../x','/manifest.json','C:/a','script.js','assets\\x'])assert.throws(()=>pack.zip([[p,new Uint8Array()]]),/非法/);
  const dup=pack.zip([['manifest.json',new Uint8Array() ],['manifest.json',new Uint8Array()]]),dupBytes=new Uint8Array(await dup.arrayBuffer());assert.throws(()=>pack.unzip(dupBytes),/重复/);
  await assert.rejects(pack.decode({size:100*1024*1024+1,arrayBuffer(){throw new Error('must not read');}}),/100 MB/);
  await assert.rejects(pack.decode(pack.zip([['manifest.json',new TextEncoder().encode(JSON.stringify(sample()))]])),/素材/);
  const bomb=raw.slice(),v=new DataView(bomb.buffer),end=bomb.length-22,center=v.getUint32(end+16,true);v.setUint32(center+24,100*1024*1024+1,true);assert.throws(()=>pack.unzip(bomb),/容量/);
  const compressed=raw.slice(),w=new DataView(compressed.buffer);w.setUint16(center+10,8,true);assert.throws(()=>pack.unzip(compressed),/压缩/);
  const symlink=raw.slice();new DataView(symlink.buffer).setUint32(center+38,0xa1ff0000,true);assert.throws(()=>pack.unzip(symlink),/特殊/);
  assert.throws(()=>pack.zip(Array.from({length:101},()=>['manifest.json',new Uint8Array()])),/100 个/);
  assert.throws(()=>pack.zip([['manifest.json',new Uint8Array(20*1024*1024+1)]]),/容量/);
});
