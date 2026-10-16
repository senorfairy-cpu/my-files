/* Preview-only layers. Original production CSS and animation parents remain untouched. */
(function(){
  "use strict";
  const schema=window.FeirooSchema,original={};
  let hero,bg,image=null,shade=null,light=null;
  function capture(){
    hero=document.getElementById("cover");bg=document.getElementById("heroBg");
    if(!hero||!bg)return;
    original.image=bg.style.backgroundImage;
    if(!Object.hasOwn(original,"base"))original.base=hero.style.background;
  }
  function rgba(hex,alpha=1){const n=hex.slice(1);return "rgba("+[0,2,4].map(i=>parseInt(n.slice(i,i+2),16)).join(",")+","+alpha*(n.length===8?parseInt(n.slice(6,8),16)/255:1)+")";}
  function palette(value){
    for(const name of ["light","dark"])hero.classList.toggle("feiroo-lab-palette-"+name,value===name);
  }
  function restoreBackground(){
    if(!hero||!bg)return;
    image?.remove();shade?.remove();light?.remove();image=shade=light=null;
    bg.style.backgroundImage=original.image;hero.style.background=original.base;
    hero.classList.remove("feiroo-lab-themed","feiroo-lab-overlay","feiroo-lab-light-components");
    hero.style.removeProperty("--feiroo-lab-overlay");hero.style.removeProperty("--feiroo-lab-mask");
  }
  function restore(){restoreBackground();if(hero)palette("original");}
  function apply(p,url){
    if(!hero||!bg)capture();
    if(!hero||!bg)return;
    palette(p.palette);
    const keys=Object.keys(p).filter(k=>k!=="palette");
    if(!keys.length||(keys.length===1&&p.theme==="dark")){restoreBackground();return;}
    const v=schema.backgroundValues(p);
    if(!image){
      image=document.createElement("div");image.className="feiroo-lab-image";
      shade=document.createElement("div");shade.className="feiroo-lab-image-shade";
      light=document.createElement("div");light.className="feiroo-lab-light";
      for(const el of [image,shade,light])el.setAttribute("aria-hidden","true");
      bg.append(image,shade);hero.append(light);
    }
    const originalUrl=original.image.match(/url\(["']?(.*?)["']?\)/)?.[1]||"";
    const source=p.mode==="original"?originalUrl:(url||originalUrl);
    image.style.backgroundImage=source?'url("'+source+'")':"none";
    image.style.backgroundSize=v.fit;image.style.backgroundPosition=v.positionX+"% "+v.positionY+"%";
    image.style.transform="scale("+v.scale+")";image.style.opacity=String(v.opacity);
    image.style.filter="brightness("+v.brightness+") blur("+v.blur+"px)";
    image.style.inset=-v.blur*2+"px";image.hidden=!v.imageVisible;
    shade.style.backgroundImage=original.image.replace(/,?\s*url\(.*\)\s*$/,"")||"none";
    shade.style.opacity=String(v.imageShadeOpacity);shade.hidden=!v.maskVisible;
    bg.style.backgroundImage="none";
    const backgrounds=[];
    if(v.lightVisible&&v.ambientStrength>0)backgrounds.push("radial-gradient(circle at 62% 28%,"+rgba("#f5882d",v.ambientStrength)+",transparent 30rem)");
    if(v.gradientVisible)backgrounds.push("linear-gradient("+v.gradientAngle+"deg,"+v.gradientColors.map(c=>rgba(c)).join(",")+")");
    hero.style.background=v.color;
    hero.style.backgroundImage=backgrounds.length?backgrounds.join(","):"none";
    light.hidden=!v.lightVisible;
    light.style.backgroundImage="radial-gradient(circle at "+v.lightX+"% "+v.lightY+"%,"+rgba(v.lightColor,v.lightStrength)+",transparent "+v.lightRange+"rem)";
    light.style.mixBlendMode=v.lightBlend;
    const h="linear-gradient(90deg,"+rgba(v.horizontalColor,v.horizontalOpacity)+" 0%,"+rgba(v.horizontalColor,v.horizontalOpacity*(.34/.78))+" "+v.horizontalStop+"%,"+rgba(v.horizontalColor,v.horizontalOpacity*.1)+" 100%)";
    const vertical="linear-gradient(180deg,"+rgba(v.verticalColor,v.verticalOpacity*(.12/.72))+" 0%,"+rgba(v.verticalColor,v.verticalOpacity)+" "+v.verticalStop+"%)";
    hero.style.setProperty("--feiroo-lab-mask",v.maskVisible?h+","+vertical:"none");
    hero.classList.add("feiroo-lab-themed");
    hero.classList.toggle("feiroo-lab-light-components",v.componentAdapt);
  }
  window.FeirooBackground=Object.freeze({capture,apply,restore});
})();
