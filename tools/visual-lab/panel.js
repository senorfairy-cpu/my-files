"use strict";
(async function(){
  const schema=window.FeirooSchema,frame=document.getElementById("preview"),status=document.getElementById("status"),
    language=document.getElementById("language"),device=document.getElementById("device"),width=document.getElementById("width");
  const initial=await fetch("/__visual-lab/defaults.json").then(r=>{if(!r.ok)throw new Error("默认值加载失败");return r.json();});
  let design=structuredClone(initial),session=null,requested=0,connectionTimer,sendFrame=0,selected="background",categoryId="background",uploadVersion=0;
  const urls={},names={},blobs={};
  const valid=schema.validateBackgroundDesign(design);if(!valid.ok)throw new Error(valid.errors.join("; "));
  design.lighting??=schema.lights.create();
  let lightPanel,storagePanel;
  const target=()=>Number(width.value)<=680?"mobile":"desktop";
  const effective=()=>schema.resolveOverrides(design,Number(width.value),language.value).background||{};
  const currentValues=()=>schema.backgroundValues(effective());
  function send(type,payload={}){if(session)frame.contentWindow.postMessage({channel:"feiroo.visualLab.v1",session,type,...payload},location.origin);}
  function commit(){
    storagePanel?.changed();
    const used=new Set([design.base,design.desktop,design.mobile,...Object.values(design.localeStyles)].map(layer=>layer.background?.assetId).filter(Boolean));
    for(const id of Object.keys(design.assets))if(!used.has(id)){
      delete design.assets[id];const old=urls[id];delete urls[id];delete names[id];delete blobs[id];if(old)setTimeout(()=>URL.revokeObjectURL(old),1000);
    }
    const result=schema.validateBackgroundDesign(design);
    if(!result.ok){status.textContent="参数未应用："+result.errors.join("; ");return;}
    if(sendFrame)cancelAnimationFrame(sendFrame);
    sendFrame=requestAnimationFrame(()=>{sendFrame=0;send("set-design",{design,assetUrls:urls,requestId:++requested,lightAck:lightPanel?.acknowledgement()});});
  }
  function setValue(key,value){
    const layer=design[target()];layer.background??={};
    if(value===undefined)delete layer.background[key];else layer.background[key]=value;
    if(!Object.keys(layer.background).length)delete layer.background;
    refreshBadges();commit();
  }
  function originFor(key){
    if(Object.hasOwn(design.mobile.background||{},key)&&target()==="mobile")return "移动独立";
    if(Object.hasOwn(design.desktop.background||{},key)&&Object.hasOwn(effective(),key))return target()==="mobile"?"移动继承":"桌面共用";
    return currentValues().theme==="dark"?"原站默认":"主题默认";
  }
  function refreshBadges(){
    const layer=target();
    document.getElementById("scopeLabel").textContent=layer==="mobile"?"当前：移动端 · 未设置项继承桌面":"当前：桌面共用 · 移动可单独覆盖";
    document.querySelectorAll("[data-source]").forEach(e=>e.textContent=originFor(e.dataset.source));
    document.querySelectorAll("[data-reset]").forEach(e=>e.disabled=!Object.hasOwn(design[layer].background||{},e.dataset.reset));
  }
  function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
  function row(label,key,parent){
    const box=node("div",undefined,"control"),head=node("div",undefined,"control-head"),id="control-"+key;
    const title=node("label",label);title.htmlFor=id;
    const source=node("small");source.dataset.source=key;
    const reset=node("button","↶");reset.type="button";reset.dataset.reset=key;reset.title="恢复此项默认或继承";reset.setAttribute("aria-label","恢复"+label+"默认");
    reset.addEventListener("click",()=>{setValue(key,undefined);buildControls();});
    head.append(title,source,reset);box.append(head);parent.append(box);return {box,id};
  }
  function numberControl(label,key,min,max,step,parent,unit=""){
    const {box,id}=row(label+(unit?"（"+unit+"）":""),key,parent),pair=node("div",undefined,"control-pair");
    const slider=node("input"),input=node("input");slider.type="range";input.type="number";
    slider.id=id;input.id=id+"-number";input.setAttribute("aria-label",label+"数值");
    for(const e of [slider,input]){e.min=min;e.max=max;e.step=step;e.value=currentValues()[key];}
    function update(from,to){const n=Number(from.value);if(from.value===""||!Number.isFinite(n)||n<min||n>max){from.setCustomValidity("请输入 "+min+" 至 "+max);return;}from.setCustomValidity("");to.value=String(n);setValue(key,n);}
    slider.addEventListener("input",()=>update(slider,input));input.addEventListener("input",()=>update(input,slider));pair.append(slider,input);box.append(pair);
  }
  function colorControl(label,key,parent,arrayIndex){
    const {box,id}=row(label,key,parent),pair=node("div",undefined,"control-pair");
    const picker=node("input"),hex=node("input");picker.type="color";hex.type="text";picker.id=id+(arrayIndex??"");hex.setAttribute("aria-label",label+"十六进制");
    const value=arrayIndex===undefined?currentValues()[key]:currentValues()[key][arrayIndex];
    box.querySelector("label").htmlFor=picker.id;
    picker.value=value.slice(0,7);hex.value=value;hex.maxLength=9;hex.spellcheck=false;
    function update(value){if(!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)){hex.setCustomValidity("请输入 #RRGGBB 或 #RRGGBBAA");return;}hex.setCustomValidity("");picker.value=value.slice(0,7);hex.value=value;if(arrayIndex===undefined)setValue(key,value);else{const colors=[...currentValues()[key]];colors[arrayIndex]=value;setValue(key,colors);}}
    picker.addEventListener("input",()=>update(picker.value+(hex.value.length===9?hex.value.slice(7):"")));hex.addEventListener("input",()=>update(hex.value));pair.append(picker,hex);box.append(pair);
  }
  function selectControl(label,key,options,parent){
    const {box,id}=row(label,key,parent),select=node("select");select.id=id;
    for(const [value,title] of options){const option=node("option",title);option.value=value;select.append(option);}
    select.value=currentValues()[key];select.addEventListener("change",()=>{setValue(key,select.value);buildControls();});box.append(select);
  }
  function group(title,parent){const details=node("details",undefined,"control-group");details.append(node("summary",title));parent.append(details);return details;}
  function toggleControl(label,key,parent){
    const {box,id}=row(label,key,parent),input=node("input");input.type="checkbox";input.id=id;input.checked=currentValues()[key];
    input.addEventListener("change",()=>{setValue(key,input.checked);buildControls();});box.append(input);
  }
  function chooseTheme(theme){
    const scope=target(),previous=effective(),stored=design[scope].background||{};
    if(theme==="custom"){const values=currentValues();delete values.mode;design[scope].background={...values,theme};}
    else {
      design[scope].background={theme};
      if(previous.assetId)design[scope].background.assetId=previous.assetId;
      // Palette changes require their own explicit action.
      if(Object.hasOwn(stored,"palette"))design[scope].background.palette=stored.palette;
    }
    uploadVersion++;buildControls();commit();
  }
  async function chooseImage(file){
    const revision=++uploadVersion,scope=target();if(!file)return;
    try{
      if(file.size>schema.PACKAGE_LIMITS.maxFileBytes)throw new Error("图片不能超过 20 MB");
      const bytes=new Uint8Array(await file.arrayBuffer()),info=window.FeirooImages.inspect(bytes,file.type);
      const bitmap=await createImageBitmap(new Blob([bytes],{type:info.mime}));
      try{window.FeirooImages.dimensions(bitmap.width,bitmap.height);}finally{bitmap.close();}
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join(""),id="image_"+hash;
      if(revision!==uploadVersion)return;
      const total=Object.values(design.assets).reduce((sum,a)=>sum+a.bytes,0);
      if(!design.assets[id]&&(total+file.size>schema.PACKAGE_LIMITS.maxUnpackedBytes||Object.keys(design.assets).length>=100))throw new Error("当前会话素材已达 100 MB 或 100 项，请恢复默认后重试");
      if(!urls[id])urls[id]=URL.createObjectURL(new Blob([bytes],{type:info.mime}));
      blobs[id]=new Blob([bytes],{type:info.mime});
      design.assets[id]={source:"local",path:"assets/"+hash+"."+info.ext,mime:info.mime,bytes:file.size,sha256:hash};names[id]=file.name;
      const layer=design[scope];layer.background??={};layer.background.assetId=id;layer.background.imageVisible=true;delete layer.background.mode;
      buildControls();commit();
    }catch(error){if(revision===uploadVersion){const message=document.getElementById("imageMessage");if(message)message.textContent="换图失败，已保留原图："+error.message;else status.textContent=error.message;}}
  }
  function buildControls(){
    const holder=document.getElementById("backgroundControls");holder.hidden=categoryId!=="background";
    if(holder.hidden){refreshBadges();return;}
    // Preserve which advanced groups are open across device/category changes.
    const opened=new Set(Array.from(holder.querySelectorAll("details[open] summary")).map(e=>e.textContent));
    holder.replaceChildren();holder.append(node("p",target()==="mobile"?"移动图未设置时继承桌面；单项 ↶ 可恢复继承。":"桌面修改会作用于仍在继承的移动参数。","muted"));
    const themeRow=row("背景主题","theme",holder),themeSelect=node("select");themeSelect.id=themeRow.id;
    for(const [value,label]of [["dark","深色 · 原站预设"],["light","亮色 · 柔和白底"],["custom","自定义 · 保留当前效果"]]){const option=node("option",label);option.value=value;themeSelect.append(option);}
    themeSelect.value=currentValues().theme;themeSelect.addEventListener("change",()=>chooseTheme(themeSelect.value));themeRow.box.append(themeSelect);
    holder.append(node("p","切换深浅主题会恢复对应的背景图层默认；自定义保留当前效果。文字与按钮配色不会自动改变。","muted"));
    if(currentValues().theme==="light"&&currentValues().palette==="original")
      holder.append(node("p","亮底尚未应用文字配色；可展开“推荐配色与亮底组件”主动应用浅底配色。","session-note"));
    const switches=node("div",undefined,"layer-switches");
    for(const [label,key]of [["背景图片","imageVisible"],["渐变底色","gradientVisible"],["光源","lightVisible"],["遮罩","maskVisible"]])toggleControl(label,key,switches);
    holder.append(switches);colorControl("纯色底色","color",holder);
    const imageBox=node("div",undefined,"control");
    const file=node("input");file.type="file";file.accept="image/jpeg,image/png,image/webp,image/avif";file.id="backgroundFile";file.setAttribute("aria-label","替换当前设备背景图片");
    file.addEventListener("change",()=>chooseImage(file.files[0]));
    const imageMessage=node("p",effective().assetId?(names[effective().assetId]||"当前会话图片"):"沿用原站 Banner 图片","muted");imageMessage.id="imageMessage";
    const fileLabel=node("label","替换当前设备图片");fileLabel.htmlFor=file.id;
    const sessionNote=node("p","未保存图片刷新后丢失。请主动保存草稿或导出设计包；图片不上传，单张 ≤20 MB。","session-note");
    imageBox.append(fileLabel,file,imageMessage,sessionNote);
    if(!currentValues().imageVisible)imageBox.append(node("p","背景图片已关闭，可直接设计纯色或渐变。","muted"));
    const resetImage=node("button",target()==="mobile"?"图片恢复桌面继承":"图片恢复原站");resetImage.addEventListener("click",()=>{uploadVersion++;setValue("assetId",undefined);setValue("imageVisible",undefined);buildControls();});imageBox.append(resetImage);holder.append(imageBox);
    numberControl("缩放","scale",1,2.5,.01,holder,"倍");numberControl("水平位置","positionX",0,100,1,holder,"%");numberControl("垂直位置","positionY",0,100,1,holder,"%");
    const imageGroup=group("图片高级 · 适配与滤镜",holder);
    selectControl("图片适配","fit",[["cover","铺满 cover"],["contain","完整 contain"]],imageGroup);
    numberControl("亮度","brightness",0,2,.01,imageGroup,"倍");numberControl("透明度","opacity",0,1,.01,imageGroup);
    numberControl("模糊","blur",0,24,.5,imageGroup,"px");
    const light=group("多光源 · 列表与调节",holder),lightHost=node("div");lightHost.id="lightsPanel";light.append(lightHost);lightPanel.mount(lightHost);
    const environment=group("底层环境光",holder);numberControl("底层环境光强度","ambientStrength",0,1,.01,environment);
    environment.append(node("p","光源总开关同时控制环境光。独立柔光在上方列表管理。","muted"));
    const shades=group("原有遮罩 · 水平与垂直",holder);
    numberControl("图片内遮罩强度","imageShadeOpacity",0,1,.01,shades);
    colorControl("水平遮罩颜色","horizontalColor",shades);numberControl("水平遮罩强度","horizontalOpacity",0,1,.01,shades);numberControl("水平过渡位置","horizontalStop",0,100,1,shades,"%");
    colorControl("垂直遮罩颜色","verticalColor",shades);numberControl("垂直遮罩强度","verticalOpacity",0,1,.01,shades);numberControl("垂直过渡位置","verticalStop",0,100,1,shades,"%");
    const gradient=group("底色与渐变",holder);
    numberControl("渐变角度","gradientAngle",0,360,1,gradient,"度");colorControl("渐变起色","gradientColors",gradient,0);colorControl("渐变终色","gradientColors",gradient,1);
    gradient.append(node("p","渐变开关开启时叠加于纯色底色之上；图片可以独立关闭。十六进制末尾两位为透明度。","muted"));
    const paletteGroup=group("推荐配色与亮底组件",holder);
    toggleControl("亮底照片墙与浮卡适配","componentAdapt",paletteGroup);
    paletteGroup.append(node("p","推荐只改变 Banner 文字和按钮颜色；需要主动点击，不修改文案、结构或布局。背景切换和恢复不会撤回已应用配色。","muted"));
    paletteGroup.append(node("p","当前推荐配色："+({original:"未应用 / 沿用原站",dark:"深底推荐",light:"浅底推荐"}[currentValues().palette]),"muted"));
    for(const [tone,label]of [["light","应用浅底推荐配色"],["dark","应用深底推荐配色"],["original","撤回推荐配色"]]){
      const button=node("button",label);button.addEventListener("click",()=>{setValue("palette",tone);buildControls();});paletteGroup.append(button);
    }
    for(const d of holder.querySelectorAll("details"))d.open=opened.has(d.querySelector("summary").textContent);
    const actions=node("div",undefined,"reset-actions"),resetDevice=node("button",target()==="mobile"?"恢复移动全部继承":"恢复桌面背景默认"),resetAll=node("button","恢复全部原站背景");
    resetDevice.addEventListener("click",()=>{uploadVersion++;const layer=design[target()],palette=layer.background?.palette;delete layer.background;if(palette!==undefined)layer.background={palette};buildControls();commit();});
    resetAll.addEventListener("click",()=>{uploadVersion++;const palettes={};for(const scope of ["base","desktop","mobile"])if(Object.hasOwn(design[scope].background||{},"palette"))palettes[scope]=design[scope].background.palette;
      for(const url of Object.values(urls))setTimeout(()=>URL.revokeObjectURL(url),1000);for(const id of Object.keys(urls)){delete urls[id];delete names[id];delete blobs[id];}
      const lighting=design.lighting;design=structuredClone(initial);design.lighting=lighting;for(const [scope,palette]of Object.entries(palettes))design[scope].background={palette};buildControls();commit();});
    actions.append(resetDevice,resetAll,node("small","背景恢复保留主动应用的推荐配色；可在上方单独撤回。"));holder.append(actions);refreshBadges();
  }
  function updateWidth(){const value=Number(width.value);frame.style.width=value+"px";frame.style.height="900px";
    storagePanel?.changed();
    document.getElementById("viewportLabel").textContent=(value<=680?"移动":"桌面")+" · "+value+"px";device.value=value<=680?"mobile":"desktop";
    document.getElementById("previewScroll").scrollTo(0,0);buildControls();send("inspect");}
  window.addEventListener("message",event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    const data=event.data;if(!data||data.channel!=="feiroo.visualLab.v1")return;
    if(data.type==="ready"&&/^[a-f0-9]{48}$/.test(data.session)){clearTimeout(connectionTimer);session=data.session;send("initialize",{design,assetUrls:urls,language:language.value,requestId:++requested});lightPanel?.refresh();return;}
    if(!session||data.session!==session)return;
    if(data.type==="light-position"){lightPanel?.onPosition(data);return;}
    if(data.type==="light-editor-exit"){lightPanel?.exit();return;}
    if(data.type==="state"&&data.requestId>=requested){language.value=data.language;storagePanel?.changed();status.textContent="实时预览 · "+data.viewportWidth+"px · "+(data.language==="zh"?"中文":"English")+" · 本地会话"+(data.appliedRevision<data.requestId?" · 正在应用…":"");}
    if(data.type==="error")status.textContent="预览未更新："+data.message;
  });
  frame.addEventListener("load",()=>{session=null;document.getElementById("previewScroll").scrollTo(0,0);clearTimeout(connectionTimer);status.textContent="正在连接预览…";
    connectionTimer=setTimeout(()=>{if(!session)status.textContent="当前页面未连接首页桥接，可点击“返回首页”。";},4000);
    frame.contentWindow.postMessage({channel:"feiroo.visualLab.v1",type:"hello"},location.origin);});
  frame.contentWindow.postMessage({channel:"feiroo.visualLab.v1",type:"hello"},location.origin);
  language.addEventListener("change",()=>{storagePanel?.changed();send("set-language",{language:language.value,requestId:++requested});});
  document.getElementById("home").addEventListener("click",()=>frame.src="/?visualLab=1");
  width.addEventListener("change",updateWidth);device.addEventListener("change",()=>{width.value=device.value==="mobile"?"390":"1440";updateWidth();});
  document.getElementById("replay").addEventListener("click",()=>send("replay"));
  document.getElementById("panelToggle").addEventListener("click",event=>{const p=document.getElementById("panel");p.hidden=!p.hidden;event.currentTarget.setAttribute("aria-expanded",String(!p.hidden));event.currentTarget.textContent=p.hidden?"展开面板":"收起面板";});
  const titles={background:"背景与光影",text:"文字",components:"按钮与基础组件",layout:"整体布局"};
  function selectObject(id){selected=id;document.getElementById("selectedObject").textContent="Banner › "+schema.objects[id].label;
    document.querySelectorAll("[data-object]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.object===id)));window.dispatchEvent(new CustomEvent("feiroo-lab:selection",{detail:{id}}));}
  function category(id){categoryId=id;document.getElementById("categoryTitle").textContent=titles[id];document.querySelectorAll("[data-category]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.category===id)));
    const container=document.getElementById("objects");container.replaceChildren();const entries=Object.entries(schema.objects).filter(([,o])=>o.category===id);
    for(const [objectId,object]of entries){const button=node("button",object.label);button.dataset.object=objectId;button.addEventListener("click",()=>selectObject(objectId));container.append(button);}
    selectObject(entries.some(([key])=>key===selected)?selected:entries[0][0]);buildControls();
    document.getElementById("futureControls").hidden=id==="background";}
  document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>category(b.dataset.category)));
  window.addEventListener("pagehide",()=>{for(const url of Object.values(urls))URL.revokeObjectURL(url);});
  window.FeirooLab=Object.freeze({validateDesign:schema.validateBackgroundDesign,resolveOverrides:schema.resolveOverrides,getDesign:()=>structuredClone(design),getObjects:()=>structuredClone(schema.objects)});
  lightPanel=window.FeirooLightPanel.create({design:()=>design,target,currentValues,values:currentValues,commit,send});
  category("background");updateWidth();
  storagePanel=window.FeirooStoragePanel.create({snapshot:()=>({design:structuredClone(design),view:{language:language.value,width:Number(width.value)},blobs:{...blobs}}),restore:async bundle=>{
    // Prepare all URLs before replacing anything; revocation only follows a successful swap.
    const next={};try{for(const [id,blob]of Object.entries(bundle.blobs))next[id]=URL.createObjectURL(blob);}catch(error){Object.values(next).forEach(URL.revokeObjectURL);throw error;}
    lightPanel.exit();uploadVersion++;const old=Object.values(urls);design=structuredClone(bundle.record.design);
    for(const map of [urls,names,blobs])for(const id of Object.keys(map))delete map[id];
    Object.assign(urls,next);Object.assign(blobs,bundle.blobs);for(const [id,a]of Object.entries(design.assets))names[id]=a.path.split('/').pop();
    language.value=bundle.record.view.language;width.value=String(bundle.record.view.width);updateWidth();lightPanel.refresh();buildControls();commit();send('set-language',{language:language.value,requestId:++requested});
    old.forEach(url=>setTimeout(()=>URL.revokeObjectURL(url),1000));
  }});
  for(const control of [language,device,width])control.disabled=false;
})().catch(error=>document.getElementById("status").textContent="编辑器初始化失败："+error.message);
