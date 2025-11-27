const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://kai.finance/vaults", { waitUntil: "networkidle0" });

  const trElement = await page.waitForSelector(
    `xpath///a[contains(@href, '/vaults/USDC')]/div`,
  );

  const [, tvl, rate] = await page.evaluate((el) => {
    const tdElements = el.querySelectorAll(":scope > div");
    return Array.from(tdElements).map((el) =>
      el.textContent.trim().match(/[\d,.]+/),
    );
  }, trElement);

  await browser.close();

  const results = {
    id: "kai-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "kai",
    name: "USDC",
    rate: parseFloat(rate),
    tvl: parseFloat(tvl) * 1000000,
  };

  console.log(results);

  fs.writeFileSync("kai-usdc.json", JSON.stringify(results) + "\n");
})();
