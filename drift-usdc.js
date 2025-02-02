const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://app.drift.trade/earn/borrow-lend");

  const markets = [
    ["drift-usdc", "USDC", "usdc.svg"],
    ["drift-usdc-jlp", "USDC (JLP)", "usdc-1.svg"],
  ];

  for (let i = 0; i < markets.length; i++) {
    const [id, name, image] = markets[i];
    const usdcRow = await page.waitForSelector(
      `xpath/(//img[@src="https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/${image}"]/ancestor::div[1]/parent::*)[1]`,
    );
    const [, tvl, rate] = await page.evaluate((el) => {
      return Array.from(el.children).map((el) => el.textContent.trim());
    }, usdcRow);
    const results = {
      id,
      timestamp: timestamp.toISOString(),
      protocol: "drift",
      name,
      rate: parseFloat(rate),
      tvl: parseFloat(tvl) * 1_000_000,
    };
    fs.writeFileSync(id + ".json", JSON.stringify(results) + "\n");
  }

  await browser.close();
})();
