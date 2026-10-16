"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),schema=require("./schema");
function fixture(){
  class Element{
    constructor(){this.children=[];this.hidden=false;const classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)};
      this.style={background:"",backgroundImage:"",setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};}
    append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
    setAttribute(){}
  }
  const hero=new Element(),bg=new Element();
  bg.style.backgroundImage='linear-gradient(90deg,rgba(9,9,8,.96),transparent), url("/original.jpg")';
  bg.style.opacity=".73";bg.style.transform="translate3d(0,25px,0)";
  const original=bg.style.backgroundImage;
  const context={window:{FeirooSchema:schema},document:{getElementById:id=>id==="cover"?hero:id==="heroBg"?bg:null,createElement:()=>new Element()}};
  vm.runInNewContext(fs.readFileSync(require.resolve("./background-adapter"),"utf8"),context);
  const api=context.window.FeirooBackground;api.capture();return{api,hero,bg,original};
}
test("light preset removes all original dark layers without altering animation parents or auto applying text palette",()=>{
  const {api,hero,bg}=fixture();api.apply({theme:"light"});
  assert.equal(hero.style.background,"#ffffff");assert.equal(hero.style.backgroundImage,"none");
  assert.equal(hero.style["--feiroo-lab-mask"],"none");assert.equal(bg.style.backgroundImage,"none");
  assert.equal(bg.children[0].hidden,true);assert.equal(bg.children[1].hidden,true);
  assert.equal(hero.children[0].style.mixBlendMode,"multiply");
  assert.equal(hero.classList.contains("feiroo-lab-palette-light"),false);
  assert.equal(bg.style.opacity,".73");assert.equal(bg.style.transform,"translate3d(0,25px,0)");
});
test("independent switches, exact dark restoration and explicit palette survive background reset",()=>{
  const {api,hero,bg,original}=fixture();
  api.apply({theme:"light",imageVisible:true,gradientVisible:true,lightVisible:false,maskVisible:false,palette:"light"});
  assert.equal(bg.children[0].hidden,false);assert.equal(bg.children[1].hidden,true);
  assert.equal(hero.children[0].hidden,true);assert.match(hero.style.backgroundImage,/linear-gradient/);
  api.apply({theme:"dark",palette:"light"});
  assert.equal(bg.children.length,0);assert.equal(hero.children.length,0);
  assert.equal(bg.style.backgroundImage,original);assert.equal(hero.style.background,"");
  assert.equal(hero.classList.contains("feiroo-lab-palette-light"),true);
  api.apply({});
  assert.equal(hero.classList.contains("feiroo-lab-palette-light"),false);
  assert.equal(hero.classList.contains("feiroo-lab-light-components"),false);
});
