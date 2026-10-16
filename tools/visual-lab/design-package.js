/* Portable data only: no scripts, filesystem extraction, or cloud requests. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./schema'),require('./image-file'));else root.FeirooPackage=factory(root.FeirooSchema,root.FeirooImages);})(typeof window==='object'?window:this,function(schema,images){
  'use strict';
  const L=schema.PACKAGE_LIMITS,encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
  const fail=m=>{throw new Error(m);},plain=x=>x&&Object.getPrototypeOf(x)===Object.prototype;
  function exact(x,keys){if(!plain(x)||Object.keys(x).some(k=>!keys.includes(k)))fail('包含未知字段，请使用兼容的 Visual Lab 版本');}
  function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(plain(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x);}
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  function validate(record){
    exact(record,['format','version','name','createdAt','view','design','extensions']);
    if(record.format!=='feiroo.visual-lab'||record.version!==1)fail('设计包版本不兼容，需要对应版本的 Visual Lab');
    if(typeof record.name!=='string'||!record.name.trim()||record.name.length>80)fail('名称必须为 1–80 字');
    if(typeof record.createdAt!=='string'||!Number.isFinite(Date.parse(record.createdAt)))fail('创建时间无效');
    exact(record.view,['language','width']);if(!['zh','en'].includes(record.view.language)||![320,375,390,430,768,1024,1440].includes(record.view.width))fail('预览配置无效');
    exact(record.extensions,[]); // Reserved; never silently discard future editing features.
    const check=schema.validateBackgroundDesign(record.design);if(!check.ok)fail('参数不兼容：'+check.errors.join('; '));
    if(!record.design.lighting)fail('缺少完整多光源配置，请重新导出设计包');
    const used=new Set([record.design.base,record.design.desktop,record.design.mobile,...Object.values(record.design.localeStyles)].map(x=>x.background?.assetId).filter(Boolean));
    if(Object.keys(record.design.assets).some(id=>!used.has(id)))fail('存在未引用素材');
    if(Object.values(record.design.assets).some(a=>!/^assets\/[a-f0-9]{64}\.(png|jpg|webp|avif)$/.test(a.path)))fail('素材路径无效');
    if(new Set(Object.values(record.design.assets).map(a=>a.path)).size!==Object.keys(record.design.assets).length)fail('重复素材路径');
    return record;
  }
  async function verify(record,blobs,decode){
    validate(record);let total=0;
    if(Object.keys(blobs).length!==Object.keys(record.design.assets).length)fail('素材数量不一致或缺失素材');
    for(const [id,a]of Object.entries(record.design.assets)){
      const blob=blobs[id];if(!(blob instanceof Blob)||blob.size!==a.bytes||blob.size>L.maxFileBytes)fail('素材缺失或大小不符：'+id);
      total+=blob.size;if(total>L.maxUnpackedBytes)fail('素材总量超过 100 MB');
      const bytes=new Uint8Array(await blob.arrayBuffer()),info=images.inspect(bytes,a.mime);
      if(a.path!=='assets/'+a.sha256+'.'+info.ext||await hash(bytes)!==a.sha256)fail('素材内容校验失败');
      if(decode)await decode(blob);
    }
    return record;
  }
  const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc(bytes){let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
  function safePath(name){if(!/^(manifest\.json|assets\/[a-f0-9]{64}\.(png|jpg|webp|avif))$/.test(name))fail('ZIP 含非法路径或不支持的文件');}
  function zip(entries){
    if(entries.length>L.maxEntries)fail('ZIP 超过 100 个条目');let offset=0,total=0;const parts=[],central=[];
    for(const [name,data]of entries){safePath(name);total+=data.length;if(data.length>L.maxFileBytes||total>L.maxUnpackedBytes)fail('ZIP 文件容量超限');
      const n=encoder.encode(name),c=crc(data),local=new Uint8Array(30+n.length),v=new DataView(local.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,c,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);local.set(n,30);
      const center=new Uint8Array(46+n.length),w=new DataView(center.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,c,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);center.set(n,46);
      parts.push(local,data);central.push(center);offset+=local.length+data.length;
    }
    const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,central.reduce((s,x)=>s+x.length,0),true);v.setUint32(16,offset,true);
    const blob=new Blob([...parts,...central,end],{type:'application/zip'});if(blob.size>L.maxZipBytes)fail('ZIP 超过 100 MB');return blob;
  }
  function unzip(bytes){
    if(bytes.length>L.maxZipBytes||bytes.length<22)fail('ZIP 大小无效');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
    const u16=p=>v.getUint16(p,true),u32=p=>v.getUint32(p,true);
    if(u32(end)!==0x06054b50||u16(end+4)||u16(end+6)||u16(end+20)||u16(end+8)!==u16(end+10))fail('损坏的 ZIP 或不支持的 ZIP 格式');
    const count=u16(end+10),start=u32(end+16);if(!count||count>L.maxEntries||start+u32(end+12)!==end)fail('ZIP 条目数或目录无效');
    const result=new Map();let at=start,localEnd=0,total=0;
    for(let i=0;i<count;i++){
      if(at+46>end||u32(at)!==0x02014b50)fail('ZIP 目录损坏');
      const packed=u32(at+20),size=u32(at+24),length=u16(at+28),extra=u16(at+30),comment=u16(at+32),offset=u32(at+42);
      if(at+46+length+extra+comment>end)fail('ZIP 目录越界');
      const name=decoder.decode(bytes.subarray(at+46,at+46+length));safePath(name);
      if(result.has(name)||u16(at+8)||u16(at+10)||extra||comment||u16(at+34)||u32(at+38))fail('ZIP 含重复、加密、压缩或特殊条目；请使用 Lab 原始导出包');
      total+=size;if(size>L.maxFileBytes||total>L.maxUnpackedBytes||packed!==size)fail('ZIP 解压容量超限或压缩格式不支持');
      if(offset!==localEnd||offset+30>start||u32(offset)!==0x04034b50||u16(offset+6)||u16(offset+8)||u16(offset+28)||u16(offset+26)!==length||u32(offset+18)!==size||u32(offset+22)!==size||u32(offset+14)!==u32(at+16))fail('ZIP 文件头不一致');
      const body=offset+30+length;if(body+size>start||decoder.decode(bytes.subarray(offset+30,body))!==name)fail('ZIP 文件路径或边界不一致');
      const data=bytes.subarray(body,body+size);if(crc(data)!==u32(at+16))fail('ZIP 内容损坏（CRC）');
      result.set(name,data);localEnd=body+size;at+=46+length;
    }
    if(at!==end||localEnd!==start)fail('ZIP 含额外隐藏内容');return result;
  }
  async function encode(record,blobs){await verify(record,blobs);const manifest=encoder.encode(JSON.stringify(record));if(manifest.length>2*1024*1024)fail('清单超过 2 MB');const entries=[['manifest.json',manifest]];
    for(const [id,a]of Object.entries(record.design.assets))entries.push([a.path,new Uint8Array(await blobs[id].arrayBuffer())]);return zip(entries);}
  async function decode(file,imageDecode){
    if(file.size>L.maxZipBytes)fail('设计包超过 100 MB');const entries=unzip(new Uint8Array(await file.arrayBuffer()));
    if(!entries.has('manifest.json')||entries.get('manifest.json').length>2*1024*1024)fail('缺少清单或清单过大');
    const record=validate(JSON.parse(decoder.decode(entries.get('manifest.json')))),blobs={};
    if(entries.size!==1+Object.keys(record.design.assets).length)fail('素材缺失或含未声明文件');
    for(const [id,a]of Object.entries(record.design.assets)){const bytes=entries.get(a.path);if(!bytes)fail('缺失素材：'+a.path);blobs[id]=new Blob([bytes],{type:a.mime});}
    await verify(record,blobs,imageDecode);return{record,blobs};
  }
  return{validate,verify,encode,decode,canonical,zip,unzip};
});
