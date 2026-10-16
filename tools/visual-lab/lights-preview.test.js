"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),crypto=require("node:crypto"),schema=require("./schema"),m=require("./lights");
function fixture(){
 class E{constructor(){this.children=[];this.dataset={};this.style={};this.events={};this.hidden=false;const c=new Set();this.classList={add:(...xs)=>xs.forEach(x=>c.add(x)),remove:(...xs)=>xs.forEach(x=>c.delete(x)),toggle:(x,v)=>v?c.add(x):c.delete(x),contains:x=>c.has(x)};}
 append(...els){for(const e of els){e.remove();e.parent=this;this.children.push(e);}}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}
 setAttribute(){}addEventListener(k,fn){this.events[k]=fn;}setPointerCapture(){}releasePointerCapture(){}getBoundingClientRect(){return{left:10,top:20,width:1000,height:500};}}
 const hero=new E(),messages=[],events={};
 const context={crypto,innerWidth:1000,window:{FeirooSchema:schema,addEventListener:(k,fn)=>events[k]=fn},document:{getElementById:()=>hero,createElement:()=>new E()}};
 vm.runInNewContext(fs.readFileSync(require.resolve("./lights-preview"),"utf8"),context);
 return{hero,messages,api:context.window.FeirooMultiLights,events,emit:(type,data)=>messages.push({type,...data})};
}
test("queued stale renders cannot drop the last drag step; final pointerup and acknowledgement are reliable",()=>{
 const f=fixture(),editor={enabled:true,selectedId:"main"};
 f.api.render(m.create(),{},editor,f.emit);
 const guide=()=>f.hero.children.find(x=>x.className==="feiroo-light-guide"),point=guide().children[0];
 const event=(x,y)=>({button:0,pointerId:1,clientX:x,clientY:y,preventDefault(){}});
 point.events.pointerdown(event(650,160));
 point.events.pointermove(event(810,220));
 f.api.render(m.create(),{},editor,f.emit); // Late render with stale base data.
 assert.match(guide().style.left,/80%/);
 point.events.pointerup({...event(910,270),type:"pointerup"});
 assert.equal(f.messages.at(-1).x,90);assert.equal(f.messages.at(-1).y,50);
 f.api.render(m.create(),{},editor,f.emit);assert.equal(guide().style.left,"90%");
 const last=f.messages.at(-1);f.api.acknowledge({gestureId:last.gestureId,sequence:last.sequence});
 const manual=m.create();manual.sources.main.desktop={x:20,y:30};
 f.api.render(manual,{},editor,f.emit);assert.equal(guide().style.left,"20%");
 f.api.render(manual,{}, {enabled:false,selectedId:"main"},f.emit);assert.equal(guide(),undefined);
});
test("empty source roster and hiding sources keep guides out of normal view",()=>{
 const f=fixture(),r=m.create();m.remove(r,"main");
 f.api.render(r,{}, {enabled:false,selectedId:null},f.emit);
 assert.equal(f.hero.classList.contains("feiroo-multilight"),true);
 assert.equal(f.hero.children.length,0);
});
