const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://app.drift.trade/earn/borrow-lend");

  const usdcRow = await page.waitForSelector(
    'xpath///img[@src="https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/usdc.svg"]/ancestor::div[1]/parent::*',
  );

  const [, tvl, rate] = await page.evaluate((el) => {
    return Array.from(el.children).map((el) => el.textContent.trim());
  }, usdcRow);

  await browser.close();

  const results = {
    id: "drift-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "drift",
    name: "USDC",
    rate: parseFloat(rate),
    tvl: parseFloat(tvl.split("$").at(-1).split(",").at(0)) * 1_000_000,
  };
  fs.writeFileSync("drift-usdc.json", JSON.stringify(results) + "\n");
})();
