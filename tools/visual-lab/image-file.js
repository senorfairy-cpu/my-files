/* Local-file preflight. Full image decoding is performed in the browser before use. */
(function(root,factory){const api=factory();if(typeof module==="object")module.exports=api;else root.FeirooImages=api;})(typeof window==="object"?window:this,function(){
  "use strict";
  const maxPixels=32000000,maxEdge=16384;
  function dimensions(width,height){if(!width||!height||width>maxEdge||height>maxEdge||width*height>maxPixels)throw new Error("图片尺寸过大（最多 3200 万像素、单边 16384px）");}
  function inspect(bytes,declared=""){
    if(!(bytes instanceof Uint8Array)||bytes.length<12||bytes.length>20971520)throw new Error("图片无效或超过 20 MB");
    const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),str=(offset,n)=>String.fromCharCode(...bytes.slice(offset,offset+n));
    let mime,ext,width,height;
    if(str(1,3)==="PNG" && bytes[0]===137 && bytes.length>=24 && str(12,4)==="IHDR"){
      mime="image/png";ext="png";width=v.getUint32(16);height=v.getUint32(20);
      for(let at=8;at+12<=bytes.length;){const length=v.getUint32(at);if(str(at+4,4)==="acTL")throw new Error("暂不支持动画图片");if(at+length+12>bytes.length)throw new Error("PNG 文件不完整");at+=length+12;}
    }else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){
      mime="image/jpeg";ext="jpg";
      for(let at=2;at+4<bytes.length;){
        if(bytes[at]!==255)break;
        const marker=bytes[at+1];if(marker===218||marker===217)break;
        if(marker===255){at++;continue;}
        if(marker===1||(marker>=208&&marker<=215)){at+=2;continue;}
        const length=v.getUint16(at+2);
        if(length<2||at+length+2>bytes.length)throw new Error("JPEG 文件不完整");
        if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=v.getUint16(at+5);width=v.getUint16(at+7);break;}at+=length+2;
      }
    }else if(str(0,4)==="RIFF"&&str(8,4)==="WEBP"){
      mime="image/webp";ext="webp";
      if(v.getUint32(4,true)+8!==bytes.length)throw new Error("WebP 文件长度无效");
      const chunk=str(12,4);
      if(chunk==="VP8X"&&bytes.length>=30){if(bytes[20]&2)throw new Error("暂不支持动画图片");width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}
      if(chunk==="VP8 "&&bytes.length>=30&&str(23,3)==="\x9d\x01\x2a"){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383;}
      if(chunk==="VP8L"&&bytes.length>=25&&bytes[20]===47){const bits=v.getUint32(21,true);width=1+(bits&16383);height=1+((bits>>>14)&16383);}
    }else if(str(4,4)==="ftyp"&&/avif|avis/.test(str(8,Math.min(56,bytes.length-8)))){
      mime="image/avif";ext="avif";if(str(8,Math.min(56,bytes.length-8)).includes("avis"))throw new Error("暂不支持动画图片");
      for(let at=4;at+16<=Math.min(bytes.length,65536);at++)if(str(at,4)==="ispe"){width=v.getUint32(at+8);height=v.getUint32(at+12);break;}
    }else throw new Error("请选择真实的 JPEG、PNG、WebP 或 AVIF 图片；SVG 和动画暂不支持");
    if(declared&&declared!==mime)throw new Error("图片声明类型与实际文件不一致");
    if(width===undefined||height===undefined)throw new Error("无法安全读取图片尺寸，请重新导出为 JPEG、PNG 或 WebP");
    dimensions(width,height);
    return {mime,ext,width,height};
  }
  return {inspect,dimensions};
});
