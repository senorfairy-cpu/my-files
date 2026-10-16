/* Shared multi-light contract and operations; no DOM, storage or dependencies. */
(function(root,factory){const api=factory();if(typeof module==="object")module.exports=api;else root.FeirooLights=api;})(typeof window==="object"?window:this,function(){
  "use strict";
  const MAX=5,COLORS={orange:"#ff8026",blue:"#429cff",green:"#58d99d",yellow:"#f4d05b",purple:"#b27bff"};
  const original={enabled:true,color:"#ff8026",x:64,y:28,width:56,height:56,sizeUnit:"rem",rotation:0,strength:.14,softness:100,blur:0,blend:"normal"};
  const keys=Object.keys(original),clone=x=>JSON.parse(JSON.stringify(x));
  const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
  const num=(x,a,b)=>typeof x==="number"&&Number.isFinite(x)&&x>=a&&x<=b;
  const id=x=>typeof x==="string"&&/^[a-z][a-z0-9_-]{0,63}$/.test(x);
  function param(key,value){
    if(key==="enabled")return typeof value==="boolean";
    if(key==="color")return typeof value==="string"&&/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value);
    if(key==="sizeUnit")return ["%","rem"].includes(value);
    if(key==="blend")return ["normal","screen","lighten","multiply","soft-light"].includes(value);
    if(["x","y","strength","softness"].includes(key))return num(value,0,key==="strength"?1:100);
    if(["width","height"].includes(key))return num(value,1,200);
    if(key==="rotation")return num(value,-180,180);
    if(key==="blur")return num(value,0,40);
    return false;
  }
  function validate(root){
    const errors=[];
    function fields(obj,allowed,path){if(!plain(obj)){errors.push(path+": expected object");return false;}for(const k of Object.keys(obj))if(!allowed.includes(k))errors.push(path+"."+k+": unknown field");return true;}
    if(!fields(root,["version","order","sources"],"lighting"))return {ok:false,errors};
    if(root.version!==1)errors.push("Unknown lighting version");
    if(!Array.isArray(root.order)||root.order.length>MAX||new Set(root.order).size!==root.order.length||root.order.some(x=>!id(x)))errors.push("Invalid light order or maximum of 5 exceeded");
    if(!plain(root.sources))errors.push("Invalid light sources");
    if(errors.length)return {ok:false,errors};
    if(Object.keys(root.sources).length!==root.order.length||root.order.some(k=>!Object.hasOwn(root.sources,k)))errors.push("Light roster and order differ");
    for(const [sourceId,source]of Object.entries(root.sources)){
      if(!id(sourceId)||!fields(source,["name","defaults","base","desktop","mobile"],sourceId))continue;
      if(typeof source.name!=="string"||!source.name.trim()||source.name.length>40)errors.push("Invalid light name");
      for(const scope of ["defaults","base","desktop","mobile"]){
        const p=source[scope];if(!fields(p,keys,sourceId+"."+scope))continue;
        if(scope==="defaults"&&keys.some(k=>!Object.hasOwn(p,k)))errors.push("Incomplete light defaults");
        for(const [key,value]of Object.entries(p))if(!param(key,value))errors.push(sourceId+"."+scope+"."+key+": invalid parameter");
      }
    }
    return {ok:errors.length===0,errors};
  }
  function create(){return {version:1,order:["main"],sources:{main:{name:"橙色主光源",defaults:clone(original),base:clone(original),desktop:{},mobile:{}}}};}
  function scopeValues(source,scope){return {...source.defaults,...source.base,...(scope!=="base"?source.desktop:{}),...(scope==="mobile"?source.mobile:{})};}
  function resolve(root,width){return root.order.map(id=>({id,name:root.sources[id].name,...scopeValues(root.sources[id],width<=680?"mobile":"desktop")}));}
  function add(root,id,color,lightTheme=false){
    if(root.order.length>=MAX)throw Error("最多 5 个光源");
    if(!/^[a-z][a-z0-9_-]{0,63}$/.test(id)||Object.hasOwn(root.sources,id))throw Error("Invalid light ID");
    const defaults={...original,color,width:70,height:100,sizeUnit:"%",x:50,y:40,strength:lightTheme?.28:.4,blend:lightTheme?"multiply":"screen"};
    if(!param("color",color))throw Error("Invalid color");
    root.sources[id]={name:"柔光 "+(root.order.length+1),defaults:clone(defaults),base:clone(defaults),desktop:{},mobile:{}};root.order.push(id);
  }
  function duplicate(root,sourceId,newId){
    if(root.order.length>=MAX)throw Error("最多 5 个光源");
    if(!Object.hasOwn(root.sources,sourceId)||!id(newId)||Object.hasOwn(root.sources,newId))throw Error("Invalid duplicate ID");
    root.sources[newId]=clone(root.sources[sourceId]);root.sources[newId].name=(root.sources[sourceId].name+" 副本").slice(0,40);
    root.order.splice(root.order.indexOf(sourceId)+1,0,newId);
  }
  function remove(root,id){delete root.sources[id];root.order=root.order.filter(k=>k!==id);}
  function move(root,id,delta){const i=root.order.indexOf(id),j=i+delta;if(i<0||j<0||j>=root.order.length)return;[root.order[i],root.order[j]]=[root.order[j],root.order[i]];}
  function reset(root,id,scope){root.sources[id][scope]=scope==="base"?clone(root.sources[id].defaults):{};}
  function isOriginal(root){if(!root||root.order.length!==1||root.order[0]!=="main")return !root;const s=root.sources.main;return s.name==="橙色主光源"&&Object.keys(s.desktop).length===0&&Object.keys(s.mobile).length===0&&keys.every(k=>s.base[k]===original[k]&&s.defaults[k]===original[k]);}
  function position(rect,clientX,clientY,offsetX=0,offsetY=0){
    if(!rect||!num(rect.width,.001,100000)||!num(rect.height,.001,100000)||![clientX,clientY,rect.left,rect.top,offsetX,offsetY].every(Number.isFinite))throw Error("Invalid drag geometry");
    const clamp=v=>Math.round(Math.min(100,Math.max(0,v))*100)/100;
    return {x:clamp((clientX-rect.left)/rect.width*100+offsetX),y:clamp((clientY-rect.top)/rect.height*100+offsetY)};
  }
  return {MAX,COLORS,original,keys,param,validate,create,scopeValues,resolve,add,duplicate,remove,move,reset,isOriginal,position,clone};
});
