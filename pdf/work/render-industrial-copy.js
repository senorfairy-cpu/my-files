const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

async function main() {
  const root = path.resolve(__dirname, "..");
  const htmlPath = path.join(root, "work", "portfolio-industrial-2026.html");
  const outputPath = path.join(root, "outputs", "portfolio-industrial-2026.pdf");
  const previewPath = path.join(root, "outputs", "portfolio-industrial-2026-preview.png");

  const browserPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const executablePath = browserPaths.find((candidate) => fs.existsSync(candidate));
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await page.pdf({
    path: outputPath,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await page.screenshot({ path: previewPath, fullPage: false });
  await browser.close();

  console.log(JSON.stringify({ outputPath, previewPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
