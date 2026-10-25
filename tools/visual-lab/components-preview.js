/* Local-only presentation adapter. Existing nodes, order and reveal transforms are preserved. */
(function(){
  "use strict";
  const schema=window.FeirooSchema,original=new WeakMap();
  const wallProps=["translate","scale","filter"],imageProps=["opacity","filter"],figureProps=["--wall-x","z-index"],markProps=["background-color","background-image","border-radius","box-shadow","backdrop-filter","-webkit-backdrop-filter"];
  let wall,mark,roster=[],selection={id:null,imageId:null};
  function save(el,props){if(el&&!original.has(el))original.set(el,Object.fromEntries(props.map(k=>[k,{value:el.style.getPropertyValue(k),priority:el.style.getPropertyPriority(k)}])));}
  function restore(el){if(!el)return;for(const [key,p]of Object.entries(original.get(el)||{}))if(p.value)el.style.setProperty(key,p.value,p.priority);else el.style.removeProperty(key);}
  function capture(assets=[]){
    wall=document.getElementById("heroWall");mark=document.querySelector("#cover .hero-mark");save(wall,wallProps);save(mark,markProps);roster=[];
    if(wall)Array.from(wall.querySelectorAll("figure")).forEach((figure,index)=>{
      const img=figure.querySelector("img");if(!img)return;
      const id=/^[A-Za-z0-9_-]{1,96}$/.test(assets[index]?.id||"")?assets[index].id:"slot_"+(index+1);
      save(figure,figureProps);save(img,imageProps);roster.push({id,name:assets[index]?.title||img.alt||"图片 "+(index+1),figure,img});
    });
  }
  const appended=(before,value)=>(before==="none"?"":before+" ")+value;
  function sourceFilter(img){
    let result;
    function walk(rules){for(const rule of rules){
      if(rule.type===4&&!matchMedia(rule.conditionText).matches)continue;
      const value=rule.style?.getPropertyValue("filter");
      if(value&&rule.selectorText&&img.matches(rule.selectorText))result=value;
      // Modern CSSStyleRule exposes an empty cssRules list for nesting too.
      if(rule.cssRules)walk(rule.cssRules);
    }}
    // Read the source declarations, never the currently composited filter from our own frame.
    for(const sheet of document.styleSheets||[])try{walk(sheet.cssRules);}catch{/* Same-origin project sheets are readable; ignore unrelated injected sheets. */}
    return result||getComputedStyle(img).filter;
  }
  function alphaColors(value,factor){return value.replace(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/g,(_,r,g,b,a)=>"rgba("+[r,g,b,Math.min(1,Math.max(0,Number(a??1)*factor))].join(",")+")");}
  function select(id,imageId=null){selection={id:["wall","mark"].includes(id)?id:null,imageId};
    wall?.toggleAttribute("data-feiroo-component-selected",selection.id==="wall"&&!selection.imageId);
    mark?.toggleAttribute("data-feiroo-component-selected",selection.id==="mark");
    for(const item of roster)item.figure.toggleAttribute("data-feiroo-component-selected",selection.id==="wall"&&selection.imageId===item.id);
  }
  function apply(design,width,lang){
    if(!wall||!mark)capture();
    const p=schema.resolveOverrides(design,width,lang),w=p.wall||{},m=p.mark||{},images=[];
    restore(wall);
    if(wall){
      if(Object.hasOwn(w,"x")||Object.hasOwn(w,"y"))wall.style.setProperty("translate",(w.x??0)+"px "+(w.y??0)+"px");
      if(Object.hasOwn(w,"scale"))wall.style.setProperty("scale",String(w.scale));
      if(Object.hasOwn(w,"opacity"))wall.style.setProperty("filter",appended(getComputedStyle(wall).filter,"opacity("+w.opacity+")"));
    }
    for(const item of roster){
      const {id,img,figure}=item;restore(img);restore(figure);
      const params=w.images?.[id]||{},style=getComputedStyle(figure),baseX=style.getPropertyValue("--wall-x");
      if(Object.hasOwn(w,"density")&&/^-?[\d.]+%$/.test(baseX.trim()))figure.style.setProperty("--wall-x",parseFloat(baseX)*w.density+"%");
      if(Object.hasOwn(params,"zIndex"))figure.style.setProperty("z-index",String(params.zIndex));
      if(Object.hasOwn(params,"opacity"))img.style.setProperty("opacity",String(params.opacity));
      let filter=sourceFilter(img);
      for(const [key,fn]of [["brightness","brightness"],["saturation","saturate"]])if(Object.hasOwn(params,key))filter=appended(filter,fn+"("+params[key]+")");
      if(Object.hasOwn(params,"brightness")||Object.hasOwn(params,"saturation"))img.style.setProperty("filter",filter);
      if(getComputedStyle(figure).display!=="none")images.push({id,name:item.name,zIndex:parseInt(getComputedStyle(figure).zIndex)||1});
    }
    restore(mark);
    const baseline={};
    if(mark){const s=getComputedStyle(mark),color=s.backgroundColor.match(/[\d.]+/g)||["35","18","9",".34"],alpha=Number(color[3]??1);
      Object.assign(baseline,{backgroundOpacity:alpha,radius:parseFloat(s.borderTopLeftRadius)||18,shadowStrength:1,blur:parseFloat((s.backdropFilter||"none").match(/blur\(([\d.]+)px\)/)?.[1])||0});
      if(Object.hasOwn(m,"backgroundOpacity")){mark.style.setProperty("background-color","rgba("+color.slice(0,3).join(",")+","+m.backgroundOpacity+")");mark.style.setProperty("background-image",alphaColors(s.backgroundImage,alpha?m.backgroundOpacity/alpha:0));}
      if(m.radius)mark.style.setProperty("border-radius",m.radius.value+"px");
      if(Object.hasOwn(m,"shadowStrength"))mark.style.setProperty("box-shadow",alphaColors(s.boxShadow,m.shadowStrength));
      if(Object.hasOwn(m,"blur")){const blur="blur("+m.blur+"px)";mark.style.setProperty("backdrop-filter",blur);mark.style.setProperty("-webkit-backdrop-filter",blur);}
    }
    select(selection.id,selection.imageId);
    return {images,wallAvailable:Boolean(wall&&!wall.hidden&&roster.length),missingImages:Object.keys(w.images||{}).filter(id=>!roster.some(item=>item.id===id)),mark:baseline};
  }
  function connect(post){document.addEventListener("click",event=>{
    if(mark&&(mark===event.target||mark.contains(event.target))){select("mark");post("select-component",{id:"mark",imageId:null});return;}
    if(wall&&(wall===event.target||wall.contains(event.target))){const item=roster.find(item=>item.figure===event.target||item.figure.contains(event.target));select("wall",item?.id||null);post("select-component",{id:"wall",imageId:item?.id||null});}
  },true);document.addEventListener("keydown",event=>{if(event.key==="Escape")select(null);});}
  function restoreAll(){restore(wall);restore(mark);for(const item of roster){restore(item.figure);restore(item.img);}}
  window.FeirooComponents=Object.freeze({capture,apply,select,connect,restore:restoreAll});
})();
