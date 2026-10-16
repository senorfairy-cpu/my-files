(function(){'use strict';
  window.FeirooStoragePanel={create(api){
    const pack=window.FeirooPackage,db=window.FeirooDrafts,$=id=>document.getElementById(id),name=$('draftName'),list=$('draftList'),message=$('storageMessage'),state=$('saveState'),dialog=$('restoreDialog');
    let active=null,items=[],busy=false,pending=null,baseline=fingerprint(),dirty=false;
    function fingerprint(){const s=api.snapshot();return pack.canonical({design:s.design,view:s.view});}
    function changed(){dirty=fingerprint()!==baseline;state.textContent=dirty?'有未保存修改':'未修改 / 已恢复或保存';state.dataset.dirty=String(dirty);}
    async function decodeImage(blob){const bitmap=await createImageBitmap(blob);try{window.FeirooImages.dimensions(bitmap.width,bitmap.height);}finally{bitmap.close();}}
    async function refresh(){items=await db.list();const selected=list.value;list.replaceChildren(new Option('新草稿（最多 10 份）',''));for(const item of items)list.add(new Option(item.record.name+' · '+new Date(item.updatedAt).toLocaleString(),item.id));list.value=items.some(x=>x.id===selected)?selected:'';$('draftCount').textContent=items.length+' / 10 份';}
    function record(snapshot){return{format:'feiroo.visual-lab',version:1,name:name.value.trim()||'未命名设计',createdAt:new Date().toISOString(),view:snapshot.view,design:snapshot.design,extensions:{}};}
    async function task(action){if(busy)return;busy=true;for(const e of document.querySelectorAll('#storagePanel button,#storagePanel input,#storagePanel select'))e.disabled=true;try{await action();}catch(e){message.textContent='操作失败，当前设计未替换：'+e.message;}finally{busy=false;for(const e of document.querySelectorAll('#storagePanel button,#storagePanel input,#storagePanel select'))e.disabled=false;changed();}}
    function propose(bundle,id){pending={bundle,id};const r=bundle.record;$('restoreSummary').textContent=r.name+' · '+new Date(r.createdAt).toLocaleString()+' · '+Object.keys(r.design.assets).length+' 张素材 · '+r.view.width+'px · '+r.view.language+' · 格式 v'+r.version+'. 导入/打开将替换当前设计'+(dirty?'，未保存的修改会丢失':'')+'。';dialog.showModal();}
    $('saveDraft').onclick=()=>task(async()=>{const s=api.snapshot(),r=record(s);await pack.verify(r,s.blobs,decodeImage);const id=active||crypto.randomUUID(),old=items.find(x=>x.id===id);if(old)r.createdAt=old.record.createdAt;
      await db.save({id,record:r,blobs:s.blobs,updatedAt:new Date().toISOString()});active=id;baseline=pack.canonical({design:s.design,view:s.view});await refresh();list.value=id;message.textContent='草稿已保存到此浏览器，图片包含在内。';});
    list.onchange=()=>{active=list.value||null;const item=items.find(x=>x.id===active);if(item)name.value=item.record.name;};
    $('openDraft').onclick=()=>task(async()=>{const item=items.find(x=>x.id===list.value);if(!item)throw new Error('请先选择草稿');await pack.verify(item.record,item.blobs,decodeImage);propose({record:structuredClone(item.record),blobs:item.blobs},item.id);});
    $('deleteDraft').onclick=()=>{const item=items.find(x=>x.id===list.value);if(!item){message.textContent='请先选择草稿';return;}pending={remove:item.id};$('restoreSummary').textContent='永久删除本机草稿“'+item.record.name+'”？当前画布不会改变。';dialog.showModal();};
    $('exportPackage').onclick=()=>task(async()=>{const s=api.snapshot(),r=record(s),blob=await pack.encode(r,s.blobs),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=r.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_')+'.feiroo.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);message.textContent='已导出含图片的独立设计包；导出不会替代保存草稿。';});
    $('importPackage').onchange=event=>{const file=event.target.files[0];event.target.value='';if(!file)return;task(async()=>{if(!file.name.toLowerCase().endsWith('.feiroo.zip'))throw new Error('请选择 .feiroo.zip 设计包');const bundle=await pack.decode(file,decodeImage);propose(bundle,null);});};
    $('confirmRestore').onclick=()=>{const operation=pending;pending=null;dialog.close();if(!operation)return;task(async()=>{
      if(operation.remove){await db.remove(operation.remove);if(active===operation.remove)active=null;await refresh();message.textContent='草稿已删除；当前设计保留。';return;}
      await api.restore(operation.bundle);active=operation.id;name.value=operation.bundle.record.name;list.value=active||'';baseline=fingerprint();message.textContent=active?'已打开本地草稿。':'设计包已恢复。可点击“保存草稿”另存到本机。';
    });};
    $('cancelRestore').onclick=()=>{pending=null;dialog.close();message.textContent='已取消，当前设计保持不变。';};dialog.addEventListener('cancel',()=>{pending=null;});
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    refresh().catch(e=>message.textContent='草稿库不可用：'+e.message+'；仍可使用设计包导入导出。');changed();return{changed};
  }};
})();
