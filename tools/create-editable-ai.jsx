var rootPath = "D:/Desktop/blog/word/2026.6/portfolio-site";
var outPath = "D:/Desktop/Portfolio_editable_fonted_v2.ai";

function readText(path) {
  var file = new File(path);
  file.encoding = "UTF-8";
  file.open("r");
  var text = file.read();
  file.close();
  return text;
}

function rgb(hex) {
  var c = new RGBColor();
  c.red = parseInt(hex.substr(1, 2), 16);
  c.green = parseInt(hex.substr(3, 2), 16);
  c.blue = parseInt(hex.substr(5, 2), 16);
  return c;
}

function noColor() {
  return new NoColor();
}

function setOpacity(item, opacity) {
  item.opacity = opacity;
}

function addRect(doc, layer, x, y, w, h, fill, stroke, strokeWidth, opacity) {
  var rect = layer.pathItems.rectangle(y, x, w, h);
  rect.filled = !!fill;
  if (fill) rect.fillColor = fill;
  rect.stroked = !!stroke;
  if (stroke) {
    rect.strokeColor = stroke;
    rect.strokeWidth = strokeWidth || 1;
  }
  if (opacity !== undefined) rect.opacity = opacity;
  return rect;
}

function addCircle(doc, layer, cx, cy, r, fill, opacity) {
  var circle = layer.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
  circle.filled = true;
  circle.fillColor = fill;
  circle.stroked = false;
  circle.opacity = opacity;
  return circle;
}

function addLine(layer, x1, y1, x2, y2, color, opacity) {
  var line = layer.pathItems.add();
  line.setEntirePath([[x1, y1], [x2, y2]]);
  line.filled = false;
  line.stroked = true;
  line.strokeColor = color;
  line.strokeWidth = 0.35;
  line.opacity = opacity;
  return line;
}

function safeFont(name) {
  try {
    return app.textFonts.getByName(name);
  } catch (e) {
    return app.textFonts[0];
  }
}

function hasCjk(text) {
  return /[\u3400-\u9fff]/.test(String(text || ""));
}

var zhTitleFont = safeFont("Judou-Sans-Hans-Bold");
var zhSubFont = safeFont("Judou-Sans-Hans-Medium");
var zhBodyFont = safeFont("Judou-Sans-Hans-Light");
var enTitleFont = safeFont("vivoSansGlobal-Extrabold");
var enSubFont = safeFont("vivoSansGlobal-Demibold");
var enBodyFont = safeFont("vivoSansGlobal-Medium");

function autoFont(text, size) {
  if (hasCjk(text)) {
    if (size >= 22) return zhTitleFont;
    if (size >= 12) return zhSubFont;
    return zhBodyFont;
  }
  if (size >= 22) return enTitleFont;
  if (size >= 12) return enSubFont;
  return enBodyFont;
}

function addText(layer, text, x, y, size, color, name, fontOverride) {
  var tf = layer.textFrames.add();
  tf.kind = TextType.POINTTEXT;
  tf.contents = String(text || "");
  tf.position = [x, y];
  tf.name = name || "Text";
  tf.textRange.characterAttributes.size = size;
  tf.textRange.characterAttributes.fillColor = color;
  tf.textRange.characterAttributes.textFont = fontOverride || autoFont(text, size);
  return tf;
}

function wrapText(text, maxUnits, maxLines) {
  var lines = [];
  var parts = String(text || "").split("\n");
  for (var p = 0; p < parts.length; p++) {
    var current = "";
    for (var i = 0; i < parts[p].length; i++) {
      var ch = parts[p].charAt(i);
      current += ch;
      var units = 0;
      for (var j = 0; j < current.length; j++) {
        units += current.charCodeAt(j) < 128 ? 0.55 : 1;
      }
      if (units >= maxUnits) {
        lines.push(current);
        current = "";
        if (maxLines && lines.length >= maxLines) return lines;
      }
    }
    if (current) lines.push(current);
    if (maxLines && lines.length >= maxLines) return lines;
  }
  return lines;
}

function addWrapped(layer, text, x, y, size, color, maxUnits, maxLines, leading, prefix) {
  var lines = wrapText(text, maxUnits, maxLines);
  for (var i = 0; i < lines.length; i++) {
    addText(layer, lines[i], x, y - i * leading, size, color, prefix + " line " + (i + 1));
  }
  return y - lines.length * leading;
}

function card(doc, layer, x, top, w, h, label, zhText, enText) {
  var group = layer.groupItems.add();
  group.name = "Card - " + label;
  var bg = addRect(doc, group, x, top, w, h, rgb("#FFFFFF"), null, 0, 5.5);
  bg.name = "Card translucent background";
  var border = addRect(doc, group, x, top, w, h, null, rgb("#D8C8AD"), 0.8, 28);
  border.name = "Card gold border";
  addText(group, String(label).toUpperCase(), x + 16, top - 24, 9, rgb("#BD8C55"), "Card eyebrow", enBodyFont);
  addText(group, "Chinese copy", x + 16, top - 54, 15, rgb("#F4EFE6"), "Chinese label", enSubFont);
  var y = addWrapped(group, zhText, x + 16, top - 78, 11, rgb("#D8C8AD"), Math.max(18, Math.floor(w / 11)), 5, 16, "Chinese copy");
  y -= 10;
  addText(group, "English copy", x + 16, y, 13, rgb("#F4EFE6"), "English label", enSubFont);
  addWrapped(group, enText, x + 16, y - 20, 10, rgb("#A9A39A"), Math.max(22, Math.floor(w / 8.5)), 5, 14, "English copy");
  return group;
}

function pageBase(doc, pageIndex, title, subtitle) {
  var W = 841.89;
  var H = 595.276;
  var gap = 32;
  var offset = pageIndex * (W + gap);
  if (pageIndex === 0) {
    doc.artboards[0].artboardRect = [0, H, W, 0];
    doc.artboards[0].name = "Page 01";
  } else {
    doc.artboards.add([offset, H, offset + W, 0]);
    doc.artboards[pageIndex].name = "Page " + ("0" + (pageIndex + 1)).slice(-2);
  }
  var layer = doc.layers.add();
  layer.name = "Page " + ("0" + (pageIndex + 1)).slice(-2) + " - " + title;
  addRect(doc, layer, offset, H, W, H, rgb("#080807"), null, 0, 100).name = "Page background";
  addCircle(doc, layer, offset + 145, H - 95, 135, rgb("#BD8C55"), 12).name = "Gold glow left";
  addCircle(doc, layer, offset + 690, H - 460, 180, rgb("#7D5530"), 13).name = "Gold glow right";
  for (var gx = 0; gx <= W; gx += 42) addLine(layer, offset + gx, H, offset + gx, 0, rgb("#F4EFE6"), 9);
  for (var gy = 0; gy <= H; gy += 42) addLine(layer, offset, gy, offset + W, gy, rgb("#F4EFE6"), 9);
  addRect(doc, layer, offset + 18, H - 18, W - 36, H - 36, null, rgb("#BD8C55"), 0.7, 34).name = "Page border";
  addText(layer, "COPY REVIEW / EDITABLE AI", offset + 42, H - 48, 9, rgb("#BD8C55"), "Page eyebrow", enBodyFont);
  addText(layer, title, offset + 42, H - 82, 28, rgb("#F4EFE6"), "Page title");
  addText(layer, subtitle || "", offset + 42, H - 108, 11, rgb("#D8C8AD"), "Page subtitle");
  addText(layer, "Portfolio website copy preview / editable AI / page " + (pageIndex + 1), offset + 42, 28, 8, rgb("#A9A39A"), "Page footer", enBodyFont);
  return { layer: layer, offset: offset, W: W, H: H };
}

function addModulePage(doc, pageIndex, title, subtitle, blocks, cols) {
  var page = pageBase(doc, pageIndex, title, subtitle);
  var margin = 42;
  var startY = page.H - 150;
  var gap = 18;
  var usableW = page.W - margin * 2;
  var colW = (usableW - gap * (cols - 1)) / cols;
  var rows = Math.ceil(blocks.length / cols);
  var rowH = Math.min(170, (startY - 70 - gap * (rows - 1)) / rows);
  for (var i = 0; i < blocks.length; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var x = page.offset + margin + col * (colW + gap);
    var top = startY - row * (rowH + gap);
    card(doc, page.layer, x, top, colW, rowH, blocks[i].label, blocks[i].zh, blocks[i].en);
  }
}

function collection(obj, key) {
  return obj && obj[key] ? obj[key] : {};
}

function parseJson(path) {
  return eval("(" + readText(path) + ")");
}

var lang = parseJson(rootPath + "/public/language-content.json");
var portfolio = parseJson(rootPath + "/data/portfolio.json");
var zh = collection(lang, "zh");
var en = collection(lang, "en");

function navText(data) {
  var nav = collection(data, "nav");
  return [nav.about, nav.chapters, nav.blog, nav.archive].join(" / ");
}

var doc = app.documents.add(DocumentColorSpace.RGB, 841.89, 595.276);
var page = 0;

addModulePage(doc, page++, "Website Copy & Font Preview", "Editable Illustrator version. Text, cards, glows and grid are separated.", [
  {
    label: "Review notes",
    zh: "1. 这是基于原 AI 尺寸重建的可编辑版本。\n2. 每个文字、卡片、圆形、线条都是独立对象。\n3. 你可以直接在 Illustrator 里改文字。",
    en: "1. This file is rebuilt as native editable Illustrator objects.\n2. Text, cards, circles and grid lines are separated.\n3. Edit copy directly in Illustrator."
  }
], 1);

addModulePage(doc, page++, "Banner / Home", "Hero title, intro, navigation and CTA copy", [
  { label: "Navigation", zh: navText(zh), en: navText(en) },
  { label: "Hero title", zh: collection(zh, "profile").title, en: collection(en, "profile").title },
  { label: "Hero intro", zh: collection(zh, "profile").intro, en: collection(en, "profile").intro },
  { label: "Hero buttons", zh: collection(zh, "hero").primaryCta + " / " + collection(zh, "hero").secondaryCta, en: collection(en, "hero").primaryCta + " / " + collection(en, "hero").secondaryCta }
], 2);

addModulePage(doc, page++, "About", "Positioning, personal intro and skill tags", [
  { label: "About title", zh: collection(zh, "about").title, en: collection(en, "about").title },
  { label: "About body", zh: collection(zh, "about").body, en: collection(en, "about").body },
  { label: "Skill tags", zh: collection(zh, "about").skills.join(" / "), en: collection(en, "about").skills.join(" / ") }
], 2);

var chapters = [];
for (var ci = 0; ci < portfolio.chapters.length; ci++) {
  var ch = portfolio.chapters[ci];
  var zhc = collection(collection(zh, "chaptersById"), ch.id);
  var enc = collection(collection(en, "chaptersById"), ch.id);
  chapters.push({
    label: "Chapter " + ch.index + " / " + ch.id,
    zh: (zhc.title || ch.title) + "\n" + (zhc.subtitle || ch.subtitle) + "\n" + (zhc.summary || ch.summary),
    en: (enc.title || ch.title) + "\n" + (enc.subtitle || ch.subtitle) + "\n" + (enc.summary || ch.summary)
  });
}
for (var cs = 0; cs < chapters.length; cs += 3) {
  addModulePage(doc, page++, "Portfolio Structure", collection(zh, "chapters").title, chapters.slice(cs, cs + 3), 3);
}

var thinking = [
  { label: "Thinking module title", zh: collection(zh, "thinking").title, en: collection(en, "thinking").title },
  { label: "View all button", zh: collection(zh, "thinking").viewAll, en: collection(en, "thinking").viewAll }
];
var articlesZh = collection(zh, "articlesById");
var articlesEn = collection(en, "articlesById");
for (var aid in articlesZh) {
  thinking.push({
    label: "Article / " + aid,
    zh: articlesZh[aid].title + "\n" + articlesZh[aid].category + "\n" + articlesZh[aid].excerpt,
    en: articlesEn[aid].title + "\n" + articlesEn[aid].category + "\n" + articlesEn[aid].excerpt
  });
}
for (var ts = 0; ts < thinking.length; ts += 4) {
  addModulePage(doc, page++, "Blog / Design Thinking", "Homepage blog entry and article summaries", thinking.slice(ts, ts + 4), 2);
}

addModulePage(doc, page++, "Archive / Contact / Footer", "Final homepage sections and footer copy", [
  { label: "Image Archive", zh: collection(zh, "archive").title, en: collection(en, "archive").title },
  { label: "Contact title", zh: collection(zh, "contact").title, en: collection(en, "contact").title },
  { label: "Contact body", zh: collection(zh, "contact").body, en: collection(en, "contact").body },
  { label: "Contact labels and note", zh: collection(zh, "contact").emailLabel + " / " + collection(zh, "contact").phoneLabel + " / " + collection(zh, "contact").wechatLabel + " / " + collection(zh, "contact").qrPlaceholder + " / " + collection(zh, "contact").note, en: collection(en, "contact").emailLabel + " / " + collection(en, "contact").phoneLabel + " / " + collection(en, "contact").wechatLabel + " / " + collection(en, "contact").qrPlaceholder + " / " + collection(en, "contact").note },
  { label: "Footer", zh: collection(zh, "footer").tagline + "\n" + collection(zh, "footer").location, en: collection(en, "footer").tagline + "\n" + collection(en, "footer").location }
], 3);

try {
  doc.layers.getByName("Layer 1").remove();
} catch (e) {}

var saveOptions = new IllustratorSaveOptions();
saveOptions.compatibility = Compatibility.ILLUSTRATOR17;
saveOptions.pdfCompatible = true;
doc.saveAs(new File(outPath), saveOptions);
doc.close(SaveOptions.DONOTSAVECHANGES);
