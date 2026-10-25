/* Three compact contexts: the wall, one existing image, and the card surface. */
(function(){
  "use strict";
  window.FeirooComponentsPanel={create(api){
    const schema=window.FeirooSchema,holder=document.getElementById("componentsControls");
    let mode="wall",imageId=null,metrics={images:[],mark:{}},open=false,renderedContext="";
    const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
    const context=()=>api.language()+"/"+api.width()+"/"+mode+"/"+imageId;
    const objectId=()=>mode==="mark"?"mark":"wall";
    const effective=()=>{const p=schema.resolveOverrides(api.design(),api.width(),api.language());return mode==="image"?(p.wall?.images?.[imageId]||{}):p[objectId()]||{};};
    const own=()=>mode==="image"?(api.design()[api.target()].wall?.images?.[imageId]||{}):(api.design()[api.target()][objectId()]||{});
    const defaults=()=>mode==="wall"?{x:0,y:0,scale:1,opacity:1,density:1}:mode==="image"?{opacity:1,brightness:1,saturation:1,zIndex:metrics.images.find(x=>x.id===imageId)?.zIndex||1}:{backgroundOpacity:.34,radius:18,shadowStrength:1,blur:18,...metrics.mark};
    function badges(){holder.querySelectorAll("[data-component-source]").forEach(e=>{const k=e.dataset.componentSource;e.textContent=Object.hasOwn(own(),k)?(api.target()==="mobile"?"移动独立":"桌面共用"):(Object.hasOwn(effective(),k)?"继承":"原站默认");});}
    function set(key,value){const layer=api.design()[api.target()],id=objectId();layer[id]??={};let fields=layer[id];
      if(mode==="image"){if(!imageId)return;fields.images??={};fields.images[imageId]??={};fields=fields.images[imageId];}
      if(value===undefined)delete fields[key];else fields[key]=value;
      if(mode==="image"){if(!Object.keys(fields).length)delete layer.wall.images[imageId];if(!Object.keys(layer.wall.images).length)delete layer.wall.images;}
      if(!Object.keys(layer[id]).length)delete layer[id];badges();api.commit();
    }
    function row(label,key,parent){const box=node("div"),head=node("div"),title=node("label",label),badge=node("small"),reset=node("button","↶");box.className="control";head.className="control-head";badge.dataset.componentSource=key;reset.setAttribute("aria-label","恢复组件"+label+"默认");reset.title="恢复此项默认或继承";reset.onclick=()=>set(key,undefined);head.append(title,badge,reset);box.append(head);parent.append(box);return {box,title};}
    function number(label,key,min,max,step,parent){const {box,title}=row(label,key,parent),pair=node("div"),slider=node("input"),input=node("input");pair.className="control-pair";slider.type="range";input.type="number";slider.id="component-"+key;input.id=slider.id+"-number";title.htmlFor=slider.id;input.setAttribute("aria-label","组件"+label+"数值");let value=effective()[key]??defaults()[key];if(typeof value==="object")value=value.value;
      for(const el of [slider,input]){el.min=min;el.max=max;el.step=step;el.value=String(value);}
      function change(from,to){const n=Number(from.value);if(from.value===""||!Number.isFinite(n)||n<min||n>max||(key==="zIndex"&&!Number.isInteger(n))){from.setCustomValidity("请输入 "+min+"–"+max);return;}from.setCustomValidity("");to.value=String(n);set(key,key==="radius"?{value:n,unit:"px"}:n);}
      slider.oninput=()=>change(slider,input);input.oninput=()=>change(input,slider);pair.append(slider,input);box.append(pair);
    }
    function render(){holder.hidden=!api.active();if(holder.hidden)return;renderedContext=context();holder.replaceChildren();
      const tabs=node("div");tabs.className="component-tabs";
      for(const [id,label]of [["wall","照片墙整体"],["image","单张图片"],["mark","浮卡"]]){const button=node("button",label);button.setAttribute("aria-pressed",String(mode===id));button.onclick=()=>{mode=id;if(mode==="image"&&!metrics.images.some(x=>x.id===imageId))imageId=metrics.images[0]?.id||null;api.send("component-selection",{id:objectId(),imageId:mode==="image"?imageId:null});render();};tabs.append(button);}holder.append(tabs);
      const note=node("p",api.target()==="mobile"?"当前为移动独立覆盖，未设置项继承桌面。":"桌面修改供移动继承；不会改变 Banner 高度或按钮。");note.className="muted";holder.append(note);
      if(mode==="image"){
        const label=node("label","当前图片"),select=node("select");select.id="component-image";label.htmlFor=select.id;
        if(!metrics.images.length){holder.append(node("p","原站当前没有可编辑照片墙图片。"));return;}
        if(!metrics.images.some(x=>x.id===imageId))imageId=metrics.images[0].id;
        for(const item of metrics.images){const option=node("option",item.name+" · "+item.id);option.value=item.id;select.append(option);}select.value=imageId;select.onchange=()=>{imageId=select.value;api.send("component-selection",{id:"wall",imageId});render();};holder.append(label,select);
      }
      api.onSelect(objectId(),mode==="image"?imageId:null);
      if(mode!=="mark"&&!metrics.wallAvailable){const warning=node("p","原站照片墙为空或隐藏；参数会保留，原始隐藏规则不会被强行解除。");warning.className="session-note";holder.append(warning);}
      if(metrics.missingImages?.length){const warning=node("p","有参数对应的图片未出现在当前照片墙中，已保留数据："+metrics.missingImages.join(", "));warning.className="session-note";holder.append(warning);}
      const advanced=node("details"),summary=node("summary",mode==="wall"?"高级 · 间距与密度":mode==="image"?"高级 · 饱和度与墙内层次":"高级 · 阴影与背景模糊");advanced.className="control-group";advanced.open=open;advanced.ontoggle=()=>open=advanced.open;advanced.append(summary);
      if(mode==="wall"){
        number("水平位移 px","x",-200,200,1,holder);number("垂直位移 px","y",-200,200,1,holder);number("整体缩放 倍","scale",.1,3,.01,holder);number("整体透明度 倍","opacity",0,1,.01,holder);
        holder.append(node("p","位移相对原站响应式位置；透明度是原动画效果的乘数，1 保持原样。","muted"));holder.append(advanced);number("间距系数","density",.25,1.5,.01,advanced);advanced.append(node("p","1 为原始排列；越小越紧密，可产生重叠。移动端保留原有裁切边界。"));
      }else if(mode==="image"){
        number("图片透明度","opacity",0,1,.01,holder);number("图片亮度 倍","brightness",0,2,.01,holder);holder.append(advanced);number("图片饱和度 倍","saturation",0,2,.01,advanced);number("层次 墙内","zIndex",1,20,1,advanced);advanced.append(node("p","亮度/饱和度叠加于当前深浅主题原图滤镜；1 保持原样。较大层次在墙内靠前，不改变 DOM 顺序或遮罩层级。"));
      }else{number("背景透明度","backgroundOpacity",0,1,.01,holder);number("圆角 px","radius",0,100,1,holder);holder.append(advanced);number("阴影强度 倍","shadowStrength",0,2,.01,advanced);number("背景模糊 px","blur",0,40,1,advanced);advanced.append(node("p","仅改变浮卡表面，数字、标签与原入场动画保持不变。"));}
      const reset=node("button",mode==="image"?"恢复当前图片 · 当前设备默认或继承":mode==="wall"?"恢复照片墙 · 当前设备全部参数":"恢复浮卡 · 当前设备默认或继承");reset.className="component-reset";reset.onclick=()=>{const layer=api.design()[api.target()];if(mode==="image"){if(layer.wall?.images){delete layer.wall.images[imageId];if(!Object.keys(layer.wall.images).length)delete layer.wall.images;if(!Object.keys(layer.wall).length)delete layer.wall;}}else delete layer[objectId()];api.commit();};holder.append(reset);badges();
    }
    return {select(id,nextImage=null){if(["wall","mark"].includes(id)){mode=nextImage?"image":id;if(nextImage)imageId=nextImage;}render();},refresh:render,receive(next){metrics=next;if(context()!==renderedContext||!(holder.contains(document.activeElement)&&["INPUT","SELECT"].includes(document.activeElement.tagName)))render();}};
  }};
})();
