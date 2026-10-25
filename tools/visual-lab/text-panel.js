/* Contextual Banner typography controls; no button or component layout editing. */
(function(){
  "use strict";
  window.FeirooTextPanel={create(api){
    const schema=window.FeirooSchema,holder=document.getElementById("textControls");
    let selected="title",metrics={},open=false,renderedContext="";
    const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
    const own=()=>api.design()[api.target()][selected]||{};
    const effective=()=>schema.resolveOverrides(api.design(),api.width(),api.language())[selected]||{};
    const values=()=>({...metrics[selected],...effective()});
    function source(key){return Object.hasOwn(own(),key)?(api.target()==="mobile"?"移动独立":"桌面共用"):(Object.hasOwn(effective(),key)?"继承":"原站自适应");}
    function badges(){holder.querySelectorAll("[data-text-source]").forEach(el=>el.textContent=source(el.dataset.textSource));}
    function set(key,value){const layer=api.design()[api.target()];layer[selected]??={};if(value===undefined)delete layer[selected][key];else layer[selected][key]=value;if(!Object.keys(layer[selected]).length)delete layer[selected];badges();api.commit();}
    function row(label,key,parent){const box=node("div"),head=node("div"),title=node("label",label),badge=node("small"),reset=node("button","↶");box.className="control";head.className="control-head";badge.dataset.textSource=key;reset.type="button";reset.setAttribute("aria-label","恢复文字"+label+"默认");reset.title="恢复此项默认 / 移动继承";reset.onclick=()=>{set(key,undefined);render();};head.append(title,badge,reset);box.append(head);parent.append(box);return {box,title};}
    function number(label,key,min,max,step,parent,dimension=false){const {box,title}=row(label,key,parent),pair=node("div"),slider=node("input"),input=node("input");pair.className="control-pair";slider.type="range";input.type="number";slider.id="text-"+key;input.id=slider.id+"-number";input.setAttribute("aria-label","文字"+label+"数值");title.htmlFor=slider.id;
      let value=values()[key];if(dimension)value=typeof value==="object"?value.value:value;value=Number(value);if(!Number.isFinite(value))value=min;
      for(const el of [slider,input]){el.min=min;el.max=max;el.step=step;el.value=String(value);}
      function change(from,to){const n=Number(from.value);if(from.value===""||!Number.isFinite(n)||n<min||n>max){from.setCustomValidity("请输入 "+min+"–"+max);return;}from.setCustomValidity("");to.value=String(n);set(key,dimension?{value:n,unit:"px"}:n);}
      slider.oninput=()=>change(slider,input);input.oninput=()=>change(input,slider);pair.append(slider,input);box.append(pair);
    }
    function select(label,key,choices,parent){const {box,title}=row(label,key,parent),input=node("select");input.id="text-"+key;title.htmlFor=input.id;for(const [value,text]of choices){const option=node("option",text);option.value=value;input.append(option);}input.value=String(effective()[key]??(key==="font"?"":values()[key]));input.onchange=()=>set(key,input.value===""?undefined:(key==="weight"?Number(input.value):input.value));box.append(input);}
    function render(){holder.hidden=!api.active();if(holder.hidden)return;renderedContext=api.language()+"/"+api.width()+"/"+selected;holder.replaceChildren();
      const note=node("p",api.target()==="mobile"?"移动排版独立覆盖；未设置项继承桌面。文案由当前语言共用。":"桌面排版供移动继承；文案只修改当前语言。点击网页文字可切换对象。");note.className="muted";holder.append(note);
      const label=node("label","内容 · "+(api.language()==="zh"?"中文":"English")),input=node("textarea");input.id="text-content";label.htmlFor=input.id;input.maxLength=4000;input.rows=selected==="intro"?4:2;input.value=Object.hasOwn(api.design().content[api.language()],selected)?api.design().content[api.language()][selected]:(metrics[selected]?.content??"");input.disabled=!metrics[selected];
      input.oninput=()=>{api.design().content[api.language()][selected]=input.value;api.commit();};const resetContent=node("button","恢复当前语言原文");resetContent.onclick=()=>{delete api.design().content[api.language()][selected];api.commit();};holder.append(label,input,resetContent);
      select("字体","font",[["","原站字体 · 自适应"],["site","Vivo · 项目字体"],["judou","Judou · 项目字体"],["system","系统字体"]],holder);
      number("字号 px","fontSize",8,200,1,holder,true);
      select("字重","weight",[["300","300 · 细"],["400","400 · 常规"],["500","500 · 中等"],["600","600 · 半粗"],["700","700 · 粗"],["800","800 · 特粗"]],holder);
      const {box,title}=row("颜色","color",holder),pair=node("div"),picker=node("input"),hex=node("input");pair.className="control-pair";picker.type="color";picker.id="text-color";title.htmlFor=picker.id;hex.type="text";hex.setAttribute("aria-label","文字颜色十六进制");hex.maxLength=9;hex.spellcheck=false;const color=values().color||"#ffffff";picker.value=color.slice(0,7);hex.value=color;
      function updateColor(value){if(!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)){hex.setCustomValidity("请输入 #RRGGBB 或 #RRGGBBAA");return;}hex.setCustomValidity("");picker.value=value.slice(0,7);hex.value=value;set("color",value);}
      picker.oninput=()=>updateColor(picker.value+(hex.value.length===9?hex.value.slice(7):""));hex.oninput=()=>updateColor(hex.value);pair.append(picker,hex);box.append(pair);
      select("对齐","align",[["left","左对齐"],["center","居中"],["right","右对齐"]],holder);
      const advanced=node("details"),summary=node("summary","高级排版 · 行高、字距、透明度与宽度");advanced.className="control-group";advanced.open=open;advanced.ontoggle=()=>open=advanced.open;advanced.append(summary);holder.append(advanced);
      number("行高 倍","lineHeight",.5,4,.01,advanced);number("字距 px","letterSpacing",-10,40,.1,advanced);number("透明度","opacity",0,1,.01,advanced);
      const widthRow=row("文本最大宽度","maxWidth",advanced),widthPair=node("div"),widthInput=node("input"),unit=node("select");widthPair.className="control-pair";widthInput.type="number";widthInput.id="text-maxWidth";widthInput.min=1;widthInput.max=4096;widthInput.step=1;widthRow.title.htmlFor=widthInput.id;unit.setAttribute("aria-label","文本宽度单位");for(const [v,t]of [["inherit","原站 / 继承"],["px","px"],["%","%"],["auto","不限制"]]){const option=node("option",t);option.value=v;unit.append(option);}const stored=own().maxWidth;unit.value=stored==="auto"?"auto":stored?.unit||"inherit";widthInput.value=String(typeof values().maxWidth==="object"?values().maxWidth.value:metrics[selected]?.maxWidth||520);widthInput.disabled=["inherit","auto"].includes(unit.value);
      function changeWidth(){widthInput.disabled=["inherit","auto"].includes(unit.value);if(unit.value==="inherit"){set("maxWidth",undefined);return;}if(unit.value==="auto"){set("maxWidth","auto");return;}const n=Number(widthInput.value);if(widthInput.value===""||!Number.isFinite(n)||n<=0||n>4096){widthInput.setCustomValidity("请输入 1–4096");return;}widthInput.setCustomValidity("");set("maxWidth",{value:n,unit:unit.value});}unit.onchange=changeWidth;widthInput.oninput=changeWidth;widthPair.append(widthInput,unit);widthRow.box.append(widthPair);
      const reset=node("button","恢复此文字对象 · 当前语言原文及当前设备排版");reset.className="text-reset";reset.onclick=()=>{delete api.design().content[api.language()][selected];delete api.design()[api.target()][selected];api.commit();};holder.append(reset);badges();
    }
    return {select(id){if(schema.textIds.includes(id))selected=id;render();},refresh:render,receive(next){metrics=next;if(renderedContext!==api.language()+"/"+api.width()+"/"+selected||!(holder.contains(document.activeElement)&&["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)))render();}};
  }};
})();
