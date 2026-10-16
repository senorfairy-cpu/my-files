(function(){'use strict';
  let connection;
  function database(){return connection??=new Promise((resolve,reject)=>{const r=indexedDB.open('feiroo-visual-lab-drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};r.onerror=()=>{connection=null;reject(r.error);};r.onblocked=()=>{connection=null;reject(new Error('草稿库被其他窗口占用，请关闭旧编辑器标签后重试'));};});}
  async function run(write,action){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts',write?'readwrite':'readonly'),store=tx.objectStore('drafts');let result,error;
    tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(error||tx.error||new Error('草稿操作失败'));try{action(store,value=>result=value,message=>{error=new Error(message);tx.abort();});}catch(e){error=e;tx.abort();}});}
  window.FeirooDrafts={list:()=>run(false,(s,done)=>{s.getAll().onsuccess=e=>done(e.target.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));}),
    save:item=>run(true,(s,done,abort)=>{s.getAllKeys().onsuccess=e=>{if(!e.target.result.includes(item.id)&&e.target.result.length>=10)return abort('最多 10 份草稿，请先删除一份');s.put(item);done(item);};}),
    remove:id=>run(true,(s)=>s.delete(id))};
})();
