/* Live light renderer and pointer guides inside the real preview document. */
(function(){
  "use strict";
  const model=window.FeirooSchema.lights,schemas=window.FeirooSchema;
  const nodes=new Map();
  let hero=null,guide=null,point=null,label=null,currentRoot=null,currentParams={},editor={enabled:false,selectedId:"main"},emit=()=>{},drag=null,tail=null;
  function rgba(hex,a){const c=hex.slice(1);return "rgba("+[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)).join(",")+","+a*(c.length===8?parseInt(c.slice(6,8),16)/255:1)+")";}
  function rect(){const r=hero.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};}
  function placement(node,light){
    Object.assign(node.style,{left:light.x+"%",top:light.y+"%",width:light.width+light.sizeUnit,height:light.height+light.sizeUnit,transform:"translate(-50%,-50%) rotate("+light.rotation+"deg)"});
  }
  function visibleLights(){return model.resolve(currentRoot,innerWidth);}
  function selected(){return visibleLights().find(x=>x.id===editor.selectedId);}
  function canonical(list,v){
    const s=list[0];
    return list.length===1&&s.enabled&&s.color===v.lightColor&&s.x===v.lightX&&s.y===v.lightY&&s.sizeUnit==="rem"&&s.width===v.lightRange*2&&s.height===v.lightRange*2&&s.rotation===0&&s.strength===v.lightStrength&&s.softness===100&&s.blur===0&&s.blend===v.lightBlend;
  }
  function clearGuide(){if(drag){try{point?.releasePointerCapture(drag.pointerId);}catch{}drag=null;}guide?.remove();guide=point=label=null;}
  function notifyPosition(phase){
    const src=selected();if(!src||!drag)return;
    tail={id:src.id,device:drag.device,x:src.x,y:src.y,gestureId:drag.gesture,sequence:++drag.sequence};
    emit("light-position",{...tail,phase});
  }
  function end(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(event.type!=="pointercancel"&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)){
      const p=model.position(rect(),event.clientX,event.clientY,drag.offsetX,drag.offsetY);
      Object.assign(currentRoot.sources[drag.id][drag.device],p);draw();
    }
    guide.dataset.dragPhase=event.type;guide.dataset.dragEnd=event.clientX+","+event.clientY;
    notifyPosition(event.type==="pointercancel"?"cancel":"end");
    const pointerId=drag.pointerId;drag=null;point?.classList.remove("dragging");
    try{point?.releasePointerCapture(pointerId);}catch{}
  }
  function drawGuide(){
    const src=selected();
    if(!editor.enabled||!src){clearGuide();return;}
    if(!guide){
      guide=document.createElement("div");guide.className="feiroo-light-guide";
      point=document.createElement("button");point.type="button";point.className="feiroo-light-point";point.textContent="✥";point.setAttribute("aria-label","拖动光源中心");
      label=document.createElement("span");label.className="feiroo-light-label";guide.append(point,label);hero.append(guide);
      point.addEventListener("pointerdown",event=>{
        if(event.button!==0||drag)return;
        const light=selected();if(!light)return;
        event.preventDefault();const p=model.position(rect(),event.clientX,event.clientY);
        drag={pointerId:event.pointerId,id:light.id,device:innerWidth<=680?"mobile":"desktop",gesture:crypto.randomUUID(),sequence:0,offsetX:light.x-p.x,offsetY:light.y-p.y};
        guide.dataset.dragPhase="start";guide.dataset.dragMoves="0";
        guide.dataset.dragStart=event.clientX+","+event.clientY;
        guide.dataset.dragInitial=light.x+","+light.y;
        guide.dataset.dragBounds=JSON.stringify(rect());
        point.setPointerCapture(event.pointerId);point.classList.add("dragging");notifyPosition("start");
      });
      point.addEventListener("pointermove",event=>{
        if(!drag||event.pointerId!==drag.pointerId)return;
        if((innerWidth<=680?"mobile":"desktop")!==drag.device){end({pointerId:event.pointerId,type:"pointercancel"});return;}
        event.preventDefault();
        guide.dataset.dragPhase="move";guide.dataset.dragMoves=String(Number(guide.dataset.dragMoves)+1);guide.dataset.dragPointer=event.clientX+","+event.clientY;
        const p=model.position(rect(),event.clientX,event.clientY,drag.offsetX,drag.offsetY);
        const src=currentRoot.sources[drag.id];if(!src)return;
        Object.assign(src[drag.device],p);draw();notifyPosition("move");
      });
      point.addEventListener("pointerup",end);point.addEventListener("pointercancel",end);
      point.addEventListener("lostpointercapture",()=>{if(drag){guide.dataset.dragPhase="lostcapture";notifyPosition("end");drag=null;}});
      point.addEventListener("keydown",event=>{
        const step=event.shiftKey?5:1,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];
        if(!delta)return;event.preventDefault();const src=selected(),device=innerWidth<=680?"mobile":"desktop";
        const x=Math.max(0,Math.min(100,src.x+delta[0])),y=Math.max(0,Math.min(100,src.y+delta[1]));
        Object.assign(currentRoot.sources[src.id][device],{x,y});draw();
        tail={id:src.id,device,x,y,gestureId:crypto.randomUUID(),sequence:1};emit("light-position",{...tail,phase:"end"});
      });
    }
    placement(guide,src);guide.dataset.lightId=src.id;
    label.textContent=src.name+" · "+src.x.toFixed(1)+" / "+src.y.toFixed(1);
    label.style.transform="translate(-50%,-100%) rotate("+(-src.rotation)+"deg)";
    point.style.transform="translate(-50%,-50%) rotate("+(-src.rotation)+"deg)";
    guide.classList.toggle("is-hidden-source",!src.enabled||!schemas.backgroundValues(currentParams).lightVisible);
  }
  function draw(){
    if(!hero||!currentRoot)return;
    const v=schemas.backgroundValues(currentParams),list=visibleLights(),useOriginal=canonical(list,v);
    hero.classList.toggle("feiroo-multilight",!useOriginal);
    const ids=new Set(useOriginal?[]:list.map(x=>x.id));
    for(const [id,node]of nodes)if(!ids.has(id)){node.remove();nodes.delete(id);}
    if(!useOriginal)for(const light of list){
      let node=nodes.get(light.id);
      if(!node){node=document.createElement("div");node.className="feiroo-multi-light";node.setAttribute("aria-hidden","true");node.dataset.lightId=light.id;nodes.set(light.id,node);}
      placement(node,light);
      node.style.backgroundImage="radial-gradient(ellipse closest-side at 50% 50%,"+rgba(light.color,light.strength)+" "+((100-light.softness)*.9)+"%,"+rgba(light.color,0)+" 100%)";
      node.style.filter="blur("+light.blur+"px)";node.style.mixBlendMode=light.blend;
      node.hidden=!v.lightVisible||!light.enabled;hero.append(node);
    }
    drawGuide();
  }
  function render(root,p,nextEditor,post){
    hero=document.getElementById("cover");if(!hero)return;
    const oldDrag=drag;
    currentRoot=root||model.create();
    // A queued repaint may hold an older object than the latest pointer event.
    if(tail&&currentRoot.sources[tail.id])Object.assign(currentRoot.sources[tail.id][tail.device],{x:tail.x,y:tail.y});
    currentParams=p;editor=nextEditor||editor;emit=post;
    if(tail&&!Object.hasOwn(currentRoot.sources,tail.id))tail=null;
    if(oldDrag){
      const src=currentRoot.sources[oldDrag.id];
      if(!src||editor.selectedId!==oldDrag.id||!editor.enabled||(innerWidth<=680?"mobile":"desktop")!==oldDrag.device)clearGuide();
    }
    draw();
  }
  function pendingPosition(){return tail;}
  function acknowledge(ack){if(!drag&&tail&&ack&&ack.gestureId===tail.gestureId&&Number.isSafeInteger(ack.sequence)&&ack.sequence>=tail.sequence)tail=null;}
  window.addEventListener("keydown",event=>{if(event.key==="Escape"&&editor.enabled){editor={...editor,enabled:false};clearGuide();emit("light-editor-exit");}});
  window.FeirooMultiLights=Object.freeze({render,pendingPosition,acknowledge});
})();
