/* Local bridge adapter. Keep the animation-bearing elements and all production files intact. */
(function(){
  "use strict";
  const schema=window.FeirooSchema,ids=schema.textIds,original=new Map(),fallback={zh:{},en:{}};
  const properties=["font-family","font-size","font-weight","line-height","letter-spacing","color","filter","max-width","text-align","white-space","overflow-wrap"];
  const fonts={site:'"Vivo Portfolio", "Judou Portfolio", "Segoe UI", "Microsoft YaHei", Arial, sans-serif',judou:'"Judou Portfolio", "Vivo Portfolio", "Microsoft YaHei", sans-serif',system:'system-ui, "Microsoft YaHei", sans-serif'};
  let selected=null,post=()=>{};
  const element=id=>document.querySelector(schema.objects[id].selector);
  function capture(lang){
    for(const id of ids){const el=element(id);if(!el)continue;
      if(!original.has(el))original.set(el,Object.fromEntries(properties.map(key=>[key,{value:el.style.getPropertyValue(key),priority:el.style.getPropertyPriority(key)}])));
      fallback[lang][id]=el.textContent;
    }
  }
  function restore(el){for(const [key,item]of Object.entries(original.get(el)||{}))if(item.value)el.style.setProperty(key,item.value,item.priority);else el.style.removeProperty(key);}
  function colorHex(value){const match=value.match(/[\d.]+/g);if(!match)return "#ffffff";const rgb=match.slice(0,3).map(x=>Math.round(Number(x)).toString(16).padStart(2,"0")).join("");const alpha=match[3]===undefined?255:Math.round(Number(match[3])*255);return "#"+rgb+(alpha===255?"":alpha.toString(16).padStart(2,"0"));}
  function apply(design,width,lang){
    const overrides=schema.resolveOverrides(design,width,lang),metrics={};
    for(const id of ids){const el=element(id);if(!el)continue;
      if(!original.has(el))capture(lang);restore(el);
      el.textContent=Object.hasOwn(design.content[lang],id)?design.content[lang][id]:(fallback[lang][id]??el.textContent);
      const p=overrides[id]||{};
      if(p.font)el.style.setProperty("font-family",fonts[p.font]);
      if(p.fontSize)el.style.setProperty("font-size",p.fontSize.value+p.fontSize.unit);
      for(const [key,property]of [["weight","font-weight"],["lineHeight","line-height"],["align","text-align"],["color","color"]])if(Object.hasOwn(p,key))el.style.setProperty(property,String(p[key]));
      if(Object.hasOwn(p,"letterSpacing"))el.style.setProperty("letter-spacing",p.letterSpacing+"px");
      // filter opacity composes with reveal opacity, rather than replacing the animation.
      if(Object.hasOwn(p,"opacity")){const prior=getComputedStyle(el).filter;el.style.setProperty("filter",(prior==="none"?"":prior+" ")+"opacity("+p.opacity+")");}
      if(Object.hasOwn(p,"maxWidth"))el.style.setProperty("max-width",p.maxWidth==="auto"?"none":p.maxWidth.value+p.maxWidth.unit);
      if(Object.keys(p).length||Object.hasOwn(design.content[lang],id)){el.style.setProperty("white-space","pre-wrap");el.style.setProperty("overflow-wrap","anywhere");}
      const s=getComputedStyle(el),size=parseFloat(s.fontSize);
      metrics[id]={content:el.textContent,font:p.font||"site",fontSize:size,weight:Number(s.fontWeight)||400,lineHeight:parseFloat(s.lineHeight)/size||1.2,letterSpacing:parseFloat(s.letterSpacing)||0,color:colorHex(s.color),opacity:p.opacity??1,maxWidth:parseFloat(s.maxWidth)||el.clientWidth,align:s.textAlign};
      el.toggleAttribute("data-feiroo-text-selected",selected===id);
    }
    return metrics;
  }
  function select(id){selected=ids.includes(id)?id:null;for(const key of ids)element(key)?.toggleAttribute("data-feiroo-text-selected",selected===key);}
  function connect(send){post=send;
    document.addEventListener("click",event=>{for(const id of ids){const el=element(id);if(el&&(el===event.target||el.contains(event.target))){select(id);post("select-text",{id});return;}}},true);
    document.addEventListener("keydown",event=>{if(event.key==="Escape"){select(null);post("text-selection-exit");}});
  }
  window.FeirooText=Object.freeze({capture,apply,select,connect});
})();
