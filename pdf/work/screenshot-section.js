const path = require("path");
const { chromium } = require("playwright");

async function main() {
  const root = path.resolve(__dirname, "..");
  const htmlPath = path.join(root, "work", "portfolio.html");
  const index = Number(process.argv[2] || 11);
  const outPath = path.join(root, "outputs", `portfolio-section-${index + 1}.png`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  const sections = await page.locator("section.page").all();
  await sections[index].screenshot({ path: outPath });
  await browser.close();
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
