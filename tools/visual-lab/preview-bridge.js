/* Dedicated-service bridge; all messages are checked against parent, origin and session. */
(function () {
  "use strict";
  if(window.parent===window) return;
  const session=document.currentScript.dataset.session,channel="feiroo.visualLab.v1";
  const schema=window.FeirooSchema,adapter=window.FeirooBackground;
  const multi=window.FeirooMultiLights;
  let lightEditor={enabled:false,selectedId:"main"};
  let requestId=0,initialized=false,design=null,assetUrls={},version=0,frame=0,appliedRevision=0;
  const decoded=new Map();
  function post(type,payload={}) {parent.postMessage({channel,session,type,...payload},location.origin);}
  function state() {post("state",{language:currentLang,viewportWidth:innerWidth,requestId,appliedRevision});}
  function decode(url) {
    if(!decoded.has(url)) {
      const img=new Image();img.src=url;
      const pending=img.decode().then(()=>{if(!img.naturalWidth || img.naturalWidth>16384 || img.naturalHeight>16384 || img.naturalWidth*img.naturalHeight>32000000) throw new Error("Image dimensions exceed limit");});
      decoded.set(url,pending);pending.catch(()=>decoded.delete(url));
    }
    return decoded.get(url);
  }
  async function apply() {
    const current=++version;
    if(!initialized || !portfolio) return;
    const p=schema.resolveOverrides(design,innerWidth,currentLang).background || {};
    const url=p.assetId ? assetUrls[p.assetId] : null;
    try {
      if(p.assetId && !url) throw new Error("Missing session image; please select it again");
      if(url && schema.backgroundValues(p).imageVisible && p.mode!=="original") await decode(url);
      if(current!==version) return;
      adapter.apply(p,url);multi?.render(design.lighting,p,lightEditor,post);appliedRevision=requestId;state();
    } catch(error) {if(current===version)post("error",{message:"图片未应用，已保留上一预览："+error.message});}
  }
  function schedule() {version++;if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=0;apply();});}
  const originalRender=render;
  render=function(...args) {
    const result=originalRender.apply(this,args);
    adapter.capture();schedule();state();
    window.dispatchEvent(new CustomEvent("feiroo-lab:render",{detail:{language:currentLang}}));
    return result;
  };
  function validateUrls(next,urls) {
    if(!urls || typeof urls!=="object" || Array.isArray(urls)) throw new Error("Invalid session assets");
    for(const [id,url] of Object.entries(urls))
      if(!Object.hasOwn(next.assets,id) || typeof url!=="string" ||
        !url.startsWith("blob:"+location.origin+"/") || /["'\\\s]/.test(url)) throw new Error("Invalid session asset URL");
    for(const layer of [next.base,next.desktop,next.mobile,...Object.values(next.localeStyles)])
      if(layer.background?.assetId && !Object.hasOwn(urls,layer.background.assetId)) throw new Error("Missing session asset");
  }
  window.addEventListener("message",event=>{
    if(event.origin!==location.origin || event.source!==parent) return;
    const data=event.data;
    if(!data || data.channel!==channel) return;
    if(data.type==="hello"){post("ready");return;}
    if(data.session!==session) return;
    try {
      if(data.type==="light-editor"){
        if(typeof data.enabled!=="boolean" || (data.selectedId!==null&&!(typeof data.selectedId==="string"&&/^[a-z][a-z0-9_-]{0,63}$/.test(data.selectedId))))throw new Error("Invalid light editor state");
        lightEditor={enabled:data.enabled,selectedId:data.selectedId};schedule();return;
      }
      if(!["initialize","set-design","set-language","inspect","replay"].includes(data.type)) return;
      if(!["inspect","replay"].includes(data.type) && (!Number.isSafeInteger(data.requestId) || data.requestId<requestId)) return;
      if(data.type==="initialize" || data.type==="set-design") {
        const result=schema.validateBackgroundDesign(data.design);
        if(!result.ok) throw new Error(result.errors.join("; "));
        validateUrls(data.design,data.assetUrls || {});
        multi?.acknowledge(data.lightAck);
        const pending=multi?.pendingPosition();
        design=data.design;
        if(pending && design.lighting?.sources[pending.id])
          Object.assign(design.lighting.sources[pending.id][pending.device],{x:pending.x,y:pending.y});
        assetUrls=data.assetUrls || {};initialized=true;
        for(const url of decoded.keys())if(!Object.values(assetUrls).includes(url))decoded.delete(url);
      }
      if(!initialized) return;
      if(!["inspect","replay"].includes(data.type)) requestId=data.requestId;
      if(data.type==="replay") replayHeroIntro();
      if(data.type==="initialize" || data.type==="set-language") {
        if(!["zh","en"].includes(data.language)) throw new Error("Invalid language");
        if(currentLang!==data.language){currentLang=data.language;if(portfolio)render();}
      }
      schedule();if(portfolio)state();
    } catch(error){post("error",{message:error.message});}
  });
  window.addEventListener("resize",()=>{if(initialized)schedule();});
  if(portfolio)adapter.capture();
  post("ready");
})();
