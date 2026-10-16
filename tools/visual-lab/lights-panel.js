/* Multi-light controls inside the existing panel; source roster is shared across devices. */
(function(){
  "use strict";
  window.FeirooLightPanel={create(api){
    const m=window.FeirooSchema.lights;
    let host=null,selected="main",scope=api.target(),lastDevice=scope,editing=false,advanced=false,lastAck=null,finishRename=null;
    const sequences=new Map(),fieldElements=new Map();
    const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
    const root=()=>api.design().lighting;
    const source=()=>root().sources[selected];
    function editor(){api.send("light-editor",{enabled:editing,selectedId:selected});const button=document.getElementById("lightEditToggle");button.textContent=editing?"退出光源编辑":"编辑光源";button.setAttribute("aria-pressed",String(editing));}
    function select(id){
      if(!Object.hasOwn(root().sources,id))return;
      const switched=selected!==id;selected=id;editing=true;
      if(switched)properties();selection();editor();
    }
    function selection(){if(!host)return;for(const row of host.querySelectorAll('.light-row')){const active=row.dataset.lightId===selected;row.classList.toggle('is-selected',active);row.querySelector('.light-choice')?.setAttribute('aria-pressed',String(active));}}
    function uniqueName(prefix){const names=new Set(Object.values(root().sources).map(s=>s.name));let n=1,candidate=prefix.slice(0,40);while(names.has(candidate)){const suffix=' '+n++;candidate=prefix.slice(0,40-suffix.length)+suffix;}return candidate;}
    function rename(id,choice){
      finishRename?.(false);
      const old=root().sources[id]?.name;if(!old)return;
      const input=node('input');input.type='text';input.className='light-rename';input.maxLength=40;input.value=old;input.setAttribute('aria-label','重命名光源');choice.replaceWith(input);
      let finished=false;
      function finish(cancel=false){
        if(finished)return;finished=true;finishRename=null;
        const src=root().sources[id],text=input.value.trim();
        if(!cancel&&text&&src&&text!==src.name){src.name=text;changed();}
        if(src){choice.querySelector('.light-name').textContent=src.name;choice.setAttribute('aria-label','选择光源 '+src.name);
          const row=input.parentElement;if(row){row.querySelector('input[type=checkbox]').setAttribute('aria-label','显示 '+src.name);row.querySelector('[data-move=up]').setAttribute('aria-label','上移 '+src.name);row.querySelector('[data-move=down]').setAttribute('aria-label','下移 '+src.name);}
          if(selected===id){const title=host.querySelector('.light-property-name');if(title){title.textContent=src.name;title.title=src.name;}}
        }
        input.replaceWith(choice);
      }
      finishRename=finish;input.addEventListener('click',e=>e.stopPropagation());input.addEventListener('dblclick',e=>e.stopPropagation());
      input.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(e.key==='Escape');choice.focus();}});
      input.addEventListener('blur',()=>finish());input.focus();input.select();
    }
    function changed(){api.commit();}
    function set(key,value){if(!source()||!m.param(key,value))return;source()[scope][key]=value;changed();}
    function button(text,fn,disabled=false){const b=node("button",text);b.type="button";b.disabled=disabled;b.addEventListener("click",fn);return b;}
    function value(){return source()?m.scopeValues(source(),scope):null;}
    function controls(parent){
      fieldElements.clear();if(!source())return;
      const scopeSelect=node("select");scopeSelect.id="light-scope";scopeSelect.setAttribute("aria-label","光源参数编辑范围");
      for(const [id,label]of [["base","通用 · 两端默认"],["desktop","桌面 · 移动继承"],["mobile","移动 · 独立覆盖"]]){const o=node("option",label);o.value=id;scopeSelect.append(o);}
      scopeSelect.value=scope;scopeSelect.addEventListener("change",()=>{scope=scopeSelect.value;render();});
      parent.append(node("label","参数编辑范围"),scopeSelect,node("p","列表与名称两端共用；独立参数优先。拖动始终写入当前预览设备。","muted"));
      function number(label,key,min,max,step,box){
        const row=node("div",undefined,"control"),head=node("div",undefined,"control-head"),id="light-"+key;
        const title=node("label",label);title.htmlFor=id;head.append(title);
        head.append(button("↶",()=>{delete source()[scope][key];changed();render();},!Object.hasOwn(source()[scope],key)));
        const pair=node("div",undefined,"control-pair"),range=node("input"),num=node("input");
        range.type="range";range.id=id;num.type="number";num.id=id+"-number";num.setAttribute("aria-label",label+"数值");
        for(const e of [range,num]){e.min=min;e.max=max;e.step=step;e.value=value()[key];}
        function input(from,to){const n=Number(from.value);if(from.value===""||!m.param(key,n)){from.setCustomValidity("数值超出允许范围");return;}from.setCustomValidity("");to.value=n;set(key,n);}
        range.addEventListener("input",()=>input(range,num));num.addEventListener("input",()=>input(num,range));pair.append(range,num);row.append(head,pair);box.append(row);fieldElements.set(key,[range,num]);
      }
      const colors=node("div",undefined,"control-pair"),color=node("input"),hex=node("input");color.type="color";color.id="light-color";color.setAttribute("aria-label","当前光源颜色");hex.type="text";hex.id="light-color-hex";hex.maxLength=9;hex.setAttribute("aria-label","当前光源HEX");
      color.value=value().color.slice(0,7);hex.value=value().color;
      function colorInput(v){if(!m.param("color",v)){hex.setCustomValidity("请输入 #RRGGBB 或 #RRGGBBAA");return;}hex.setCustomValidity("");color.value=v.slice(0,7);hex.value=v;set("color",v);}
      color.addEventListener("input",()=>colorInput(color.value+(hex.value.length===9?hex.value.slice(7):"")));hex.addEventListener("input",()=>colorInput(hex.value));colors.append(color,hex);parent.append(node("label","颜色"),colors);
      number("水平 X（%）","x",0,100,.01,parent);number("垂直 Y（%）","y",0,100,.01,parent);number("强度","strength",0,1,.01,parent);
      const details=node("details",undefined,"control-group");details.open=advanced;details.append(node("summary","光源高级 · 椭圆、旋转与柔化"));details.addEventListener("toggle",()=>advanced=details.open);
      const unit=node("select");unit.id="light-sizeUnit";unit.setAttribute("aria-label","光源尺寸单位");
      for(const [id,label]of [["%","相对 Banner 百分比"],["rem","rem · 原站主光源单位"]]){const o=node("option",label);o.value=id;unit.append(o);}unit.value=value().sizeUnit;unit.addEventListener("change",()=>{set("sizeUnit",unit.value);render();});
      details.append(node("label","尺寸单位"),unit);
      number("宽度","width",1,200,.5,details);number("高度","height",1,200,.5,details);number("旋转（度）","rotation",-180,180,1,details);
      number("边缘柔化（%）","softness",0,100,1,details);number("模糊（px）","blur",0,40,.5,details);
      const blend=node("select");blend.id="light-blend";blend.setAttribute("aria-label","当前光源混合模式");
      for(const [id,label]of [["normal","正常"],["screen","滤色 screen"],["lighten","变亮 lighten"],["multiply","正片叠底 multiply"],["soft-light","柔光 soft-light"]]){const o=node("option",label);o.value=id;blend.append(o);}
      blend.value=value().blend;blend.addEventListener("change",()=>set("blend",blend.value));details.append(node("label","混合模式"),blend);
      parent.append(details,button("恢复此光源当前范围",()=>{m.reset(root(),selected,scope);changed();render();}));
    }
    function properties(){
      if(!host)return;const previous=host.querySelector('.light-properties');previous?.remove();fieldElements.clear();
      const section=node('section',undefined,'light-properties');section.setAttribute('aria-label','选中光源属性');
      if(source()){
        const header=node('div',undefined,'light-property-heading'),title=node('strong',source().name,'light-property-name');title.title=source().name;
        const copy=button('复制',()=>{const name=uniqueName(source().name+' 副本'),id='light_'+crypto.randomUUID().replaceAll('-','').slice(0,16);m.duplicate(root(),selected,id);root().sources[id].name=name;selected=id;editing=true;changed();render();},root().order.length>=m.MAX);copy.setAttribute('aria-label','复制选中光源');
        const remove=button('删除',()=>{m.remove(root(),selected);changed();render();});remove.setAttribute('aria-label','删除选中光源');
        header.append(title,copy,remove);const body=node('div',undefined,'light-properties-body');body.tabIndex=0;body.setAttribute('aria-label','光源参数滚动区域');controls(body);section.append(header,body);
      }else section.append(node('p','当前没有光源，可新增一个柔光。','muted'));
      host.querySelector('.light-property-slot')?.append(section);
    }
    function render(){
      if(!host||!host.isConnected)return;
      finishRename?.(false);
      if(api.target()!==lastDevice){if(scope!=="base")scope=api.target();lastDevice=api.target();}
      if(!Object.hasOwn(root().sources,selected))selected=root().order.at(-1)||null;
      host.replaceChildren();host.className="multi-light-panel";
      const list=node("div",undefined,"light-list");
      list.setAttribute('aria-label','光源图层列表');
      for(const id of [...root().order].reverse()){
        const row=node("div",undefined,"light-row");row.dataset.lightId=id;
        const p=m.scopeValues(root().sources[id],api.target()),visible=node("input");visible.type="checkbox";visible.checked=p.enabled;visible.setAttribute("aria-label","显示 "+root().sources[id].name);
        visible.addEventListener("change",()=>{root().sources[id][api.target()].enabled=visible.checked;changed();render();});
        const choice=button(undefined,()=>select(id));choice.className="light-choice";choice.setAttribute("aria-pressed",String(id===selected));choice.setAttribute('aria-label','选择光源 '+root().sources[id].name);
        const name=node('span',root().sources[id].name,'light-name');name.title='双击重命名';name.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();rename(id,choice);});choice.append(name);
        const up=button("↑",()=>{m.move(root(),id,1);changed();render();},root().order.indexOf(id)===root().order.length-1);up.setAttribute("aria-label","上移 "+root().sources[id].name);
        const down=button("↓",()=>{m.move(root(),id,-1);changed();render();},root().order.indexOf(id)===0);down.setAttribute("aria-label","下移 "+root().sources[id].name);
        up.dataset.move='up';down.dataset.move='down';
        row.addEventListener('click',event=>{if(!event.target.closest('button,input'))select(id);});
        row.append(visible,choice,up,down);list.append(row);
      }
      const addRow=node("div",undefined,"light-actions"),preset=node("select");preset.id="new-light-preset";preset.setAttribute("aria-label","新光源颜色预设");
      for(const [id,label]of [["orange","橙"],["blue","蓝"],["green","绿"],["yellow","黄"],["purple","紫"]]){const o=node("option",label);o.value=id;preset.append(o);}
      const custom=node("input");custom.type="color";custom.id="new-light-color";custom.value=m.COLORS.orange;custom.setAttribute("aria-label","新光源自定义颜色");preset.addEventListener("change",()=>custom.value=m.COLORS[preset.value]);
      const add=button("＋ 新增光源",()=>{const name=uniqueName('柔光'),id="light_"+crypto.randomUUID().replaceAll("-","").slice(0,16),v=api.values(),bright=v.theme==="light"||parseInt(v.color.slice(1,3),16)>180&&parseInt(v.color.slice(3,5),16)>180&&parseInt(v.color.slice(5,7),16)>180;
        m.add(root(),id,custom.value,bright);root().sources[id].name=name;selected=id;editing=true;changed();render();},root().order.length>=m.MAX);
      add.id="add-light";addRow.classList.add('light-add');addRow.append(add,preset,custom);host.append(addRow,list,node("p","光源 "+root().order.length+" / "+m.MAX+" · 上方为前景 · 双击名称重命名","muted"));
      host.append(node('div',undefined,'light-property-slot'));properties();selection();
      host.append(node("p","原站底层环境光仍独立保留，可在对应折叠项设为 0。","muted"));
      host.append(node("p",editing?"正在编辑：拖动中心点；方向键微调，Shift 加速；Esc 退出。":"正常预览：点击光源名称或“编辑光源”显示控制点。","muted"),
        button("全部光源恢复原站",()=>{api.design().lighting=m.create();selected="main";scope=api.target();changed();render();}));
      editor();
    }
    document.getElementById("lightEditToggle").addEventListener("click",()=>{editing=!editing;render();});
    function onPosition(data){
      if(!editing||!["desktop","mobile"].includes(data.device)||!Object.hasOwn(root().sources,data.id)||!m.param("x",data.x)||!m.param("y",data.y)||typeof data.gestureId!=="string"||!/^[a-f0-9-]{36}$/.test(data.gestureId)||!Number.isSafeInteger(data.sequence))return;
      if(!["start","move","end","cancel"].includes(data.phase))return;
      const key=data.id+":"+data.device+":"+data.gestureId;
      if(data.device!==api.target()&&!sequences.has(key))return;
      if(data.sequence<=(sequences.get(key)||0))return;sequences.set(key,data.sequence);
      if(sequences.size>100)sequences.delete(sequences.keys().next().value);
      lastAck={gestureId:data.gestureId,sequence:data.sequence};
      Object.assign(root().sources[data.id][data.device],{x:data.x,y:data.y});
      if(data.device===api.target()&&(selected===data.id||data.phase==="start")){
        const changedScope=scope!==data.device||selected!==data.id;scope=data.device;selected=data.id;
        if(changedScope)render();else for(const key of ["x","y"])for(const input of fieldElements.get(key)||[])input.value=data[key];
      }
      changed();
    }
    return {mount(element){host=element;render();},onPosition,exit(){editing=false;render();},refresh:render,acknowledgement:()=>lastAck};
  }};
})();
