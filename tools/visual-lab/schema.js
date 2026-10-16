/* Shared browser/Node contract. Empty overrides preserve the site's adaptive CSS. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FeirooSchema = api;
})(typeof window === "object" ? window : this, function () {
  "use strict";
  const lights=typeof module==="object"&&module.exports?require("./lights"):window.FeirooLights;
  const BASE_COMMIT = "2e8d26d182174b99478307d3310fc9302637088f";
  const PACKAGE_LIMITS = Object.freeze({
    maxFileBytes: 20 * 1024 * 1024,
    maxZipBytes: 100 * 1024 * 1024,
    maxUnpackedBytes: 100 * 1024 * 1024,
    maxEntries: 100
  });
  const objects = Object.freeze({
    background: { label: "背景与光影", selector: "#heroBg", category: "background" },
    eyebrow: { label: "眉题", selector: "#cover .hero-copy > .eyebrow", category: "text" },
    title: { label: "主标题", selector: "#profileName", category: "text" },
    intro: { label: "简介", selector: "#profileIntro", category: "text" },
    primary: { label: "主按钮", selector: "#cover .hero-actions .primary", category: "components" },
    secondary: { label: "次按钮", selector: "#cover .hero-actions .ghost", category: "components" },
    wall: { label: "照片墙整体", selector: "#heroWall", category: "components" },
    mark: { label: "图库浮卡整体", selector: "#cover .hero-mark", category: "components" },
    layout: { label: "Banner 布局", selector: "#cover", category: "layout" }
  });
  const plain = x => x !== null && typeof x === "object" && !Array.isArray(x) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(x));
  const number = (min, max) => x => typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
  const oneOf = (...values) => x => values.includes(x);
  const color = x => typeof x === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(x);
  const assetId = x => typeof x === "string" && /^[a-zA-Z0-9_-]{1,96}$/.test(x);
  const dimension = x => x === "auto" || (plain(x) && Object.keys(x).length === 2 &&
    Object.hasOwn(x, "value") && Object.hasOwn(x, "unit") &&
    number(0, 4096)(x.value) && oneOf("px", "%", "vh", "rem")(x.unit));
  const text = x => typeof x === "string" && x.length <= 4000;
  const textRules = {
    font: oneOf("site", "system"), fontSize: dimension, weight: number(100,900),
    letterSpacing: number(-10,40), lineHeight: number(.5,4), color,
    opacity: number(0,1), maxWidth: dimension, align: oneOf("left","center","right"),
    gap: dimension, offsetX: number(-200,200), offsetY: number(-200,200)
  };
  const appearance = {
    width: dimension, height: dimension, paddingTop: dimension, paddingRight: dimension,
    paddingBottom: dimension, paddingLeft: dimension, radius: dimension,
    background: color, color, borderColor: color, borderWidth: number(0,20),
    opacity: number(0,1)
  };
  const rules = {
    background: {
      theme: oneOf("dark","light","custom"), palette: oneOf("original","dark","light"),
      imageVisible: x=>typeof x==="boolean", gradientVisible: x=>typeof x==="boolean",
      lightVisible: x=>typeof x==="boolean", maskVisible: x=>typeof x==="boolean",
      componentAdapt: x=>typeof x==="boolean",
      lightBlend: oneOf("normal","multiply","screen","soft-light"), ambientStrength:number(0,1),
      mode: oneOf("original","solid","gradient","image"), assetId,
      fit: oneOf("cover","contain"), scale: number(1,2.5), positionX: number(0,100),
      positionY: number(0,100), brightness: number(0,2), opacity: number(0,1),
      blur: number(0,24), color, gradientAngle: number(0,360),
      gradientColors: x => Array.isArray(x) && x.length >= 2 && x.length <= 3 && x.every(color),
      lightColor: color, lightX: number(0,100), lightY: number(0,100),
      lightStrength: number(0,1), lightRange: number(0,100),
      horizontalColor: color, horizontalOpacity: number(0,1), horizontalStop: number(0,100),
      verticalColor: color, verticalOpacity: number(0,1), verticalStop: number(0,100),
      imageShadeOpacity: number(0,1)
    },
    eyebrow: textRules, title: textRules, intro: textRules,
    primary: appearance, secondary: appearance,
    wall: { visible: x=>typeof x === "boolean", x: number(-200,200), y: number(-200,200),
      scale: number(.1,3), rotation: number(-180,180), opacity: number(0,1) },
    mark: { visible: x=>typeof x === "boolean", x: number(-200,200), y: number(-200,200),
      width: dimension, height: dimension, radius: dimension, opacity: number(0,1) },
    layout: { width: dimension, maxWidth: dimension, minHeight: dimension,
      paddingTop: dimension, paddingRight: dimension, paddingBottom: dimension,
      paddingLeft: dimension, marginTop: dimension, marginBottom: dimension,
      radiusTopLeft: dimension, radiusTopRight: dimension, radiusBottomLeft: dimension,
      radiusBottomRight: dimension, align: oneOf("start","center","end"),
      direction: oneOf("row","column"), gap: dimension, buttonGap: dimension,
      buttonDirection: oneOf("row","column") }
  };
  function validateDesign(value) {
    const errors = [];
    function keys(obj, allowed, path) {
      if (!plain(obj)) { errors.push(path + ": expected object"); return false; }
      for (const key of Object.keys(obj)) if (!allowed.includes(key)) errors.push(path + "." + key + ": unknown field");
      return true;
    }
    function styles(obj, path) {
      if (!keys(obj, Object.keys(objects), path)) return;
      for (const [id, fields] of Object.entries(obj)) {
        if (!Object.hasOwn(rules,id)) continue;
        if (!keys(fields, Object.keys(rules[id]), path+"."+id)) continue;
        for (const [key, v] of Object.entries(fields)) {
          if (!Object.hasOwn(rules[id],key)) continue;
          if (!rules[id][key](v)) errors.push(path+"."+id+"."+key+": invalid value");
          if (key === "assetId" && !Object.hasOwn(value.assets || {},v)) errors.push(path+": missing asset "+v);
        }
      }
    }
    if (!keys(value, ["schemaVersion","baseCommit","defaultPresetVersion","assets","content","base","desktop","mobile","localeStyles","lighting"],"design")) return {ok:false,errors};
    if(value.lighting!==undefined)errors.push(...lights.validate(value.lighting).errors);
    if (value.schemaVersion !== 1) errors.push("Unsupported schemaVersion");
    if (value.baseCommit !== BASE_COMMIT) errors.push("Incompatible baseCommit");
    if (value.defaultPresetVersion !== "original-v1") errors.push("Unknown defaultPresetVersion");
    if (keys(value.assets, Object.keys(plain(value.assets) ? value.assets : {}),"assets")) {
      if (Object.keys(value.assets).length > PACKAGE_LIMITS.maxEntries) errors.push("Too many assets");
      for (const [id, a] of Object.entries(value.assets)) {
        if (!assetId(id)) errors.push("Invalid asset ID");
        if (!keys(a,["source","path","mime","bytes","sha256"],"assets."+id)) continue;
        if (!oneOf("project","local")(a.source)) errors.push("Invalid asset source");
        if (typeof a.path !== "string" || !/^(assets\/|fonts\/)/.test(a.path) ||
            a.path.split("/").some(p=>!p || p==="." || p==="..") || /[\\:\x00-\x1f?#%]/.test(a.path)) errors.push("Unsafe asset path");
        if (!oneOf("image/jpeg","image/png","image/webp","image/avif","font/woff","font/woff2","font/ttf","font/otf")(a.mime)) errors.push("Invalid MIME");
        if (!Number.isSafeInteger(a.bytes) || !number(1,PACKAGE_LIMITS.maxFileBytes)(a.bytes)) errors.push("Invalid asset size");
        if (typeof a.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(a.sha256)) errors.push("Invalid asset hash");
      }
    }
    if (keys(value.content,["zh","en"],"content")) for (const lang of ["zh","en"]) {
      const fields=value.content[lang];
      if (keys(fields,["eyebrow","title","intro","primary","secondary"],"content."+lang))
        for (const v of Object.values(fields)) if (!text(v)) errors.push("Invalid plain text");
    }
    for (const key of ["base","desktop","mobile"]) styles(value[key],key);
    if (keys(value.localeStyles,["zh","en"],"localeStyles"))
      for (const lang of ["zh","en"]) styles(value.localeStyles[lang],"localeStyles."+lang);
    return {ok:errors.length===0,errors};
  }
  function resolveOverrides(design, width, lang) {
    const result=validateDesign(design);
    if (!result.ok) throw new Error(result.errors.join("; "));
    if (!Number.isFinite(width) || width <= 0 || !["zh","en"].includes(lang)) throw new Error("Invalid viewport or language");
    const merged={};
    // Desktop is the inherited device baseline; <=680 adds mobile overrides.
    for (const layer of [design.base,design.desktop,...(width<=680?[design.mobile]:[]),design.localeStyles[lang]])
      for (const [id, fields] of Object.entries(layer)) {
        let previous=merged[id]||{};
        // A different device theme must not inherit the other theme's dark masks/colors.
        if(id==="background" && Object.hasOwn(fields,"theme") && fields.theme!==(previous.theme??"dark"))
          previous=Object.fromEntries(Object.entries(previous).filter(([key])=>["assetId","palette","fit","scale","positionX","positionY","brightness","opacity","blur"].includes(key)));
        merged[id]={...previous,...fields};
      }
    return merged;
  }
  const backgroundDefaults = Object.freeze({
    theme:"dark",palette:"original",imageVisible:true,gradientVisible:true,lightVisible:true,maskVisible:true,
    componentAdapt:false,lightBlend:"normal",ambientStrength:.32,
    mode:"original",fit:"cover",scale:1,positionX:50,positionY:50,
    brightness:1,opacity:1,blur:0,color:"#090908",gradientAngle:135,
    gradientColors:["#ff7a1f29","#000000db"],
    lightColor:"#ff8026",lightX:64,lightY:28,lightStrength:.14,lightRange:28,
    horizontalColor:"#050403",horizontalOpacity:.78,horizontalStop:42,
    verticalColor:"#060403",verticalOpacity:.72,verticalStop:100,imageShadeOpacity:1
  });
  function backgroundValues(overrides={}) {
    const light=overrides.theme==="light"?{
      color:"#ffffff",imageVisible:false,gradientVisible:false,maskVisible:false,
      componentAdapt:true,lightColor:"#9db6cc",lightStrength:.22,lightRange:32,
      lightBlend:"multiply",ambientStrength:0,gradientColors:["#f8fafcff","#eef2f6ff"],
      horizontalColor:"#607182",horizontalOpacity:.12,verticalColor:"#607182",
      verticalOpacity:.08,imageShadeOpacity:0
    }:{};
    const result={...backgroundDefaults,...light,...overrides};
    // Retain compatibility with phase-two designs; new controls use independent flags.
    if(Object.hasOwn(overrides,"mode")) {
      if(!Object.hasOwn(overrides,"imageVisible"))result.imageVisible=!["solid","gradient"].includes(overrides.mode);
      if(!Object.hasOwn(overrides,"gradientVisible"))result.gradientVisible=overrides.mode!=="solid";
    }
    return result;
  }
  function validateBackgroundDesign(design) {
    const result=validateDesign(design);
    if(!result.ok) return result;
    const errors=[];
    for(const layer of [design.base,design.desktop,design.mobile,...Object.values(design.localeStyles)])
      if(Object.keys(layer).some(id=>id!=="background")) errors.push("Only background parameters are enabled in phase two");
    if(Object.values(design.content).some(layer=>Object.keys(layer).length)) errors.push("Text editing is not enabled");
    return {ok:errors.length===0,errors};
  }
  return Object.freeze({BASE_COMMIT,PACKAGE_LIMITS,objects,validateDesign,resolveOverrides,backgroundDefaults,backgroundValues,validateBackgroundDesign,lights});
});
