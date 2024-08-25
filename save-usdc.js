const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://save.finance/dashboard");

  const rateElement = await page.waitForSelector(
    'xpath/(//*[contains(., "APR") and contains(., "USDC") and contains(., "Deposits")])[last()]//p[contains(., "Deposit APR")]/following-sibling::*[1]',
  );
  const rate = await page.evaluate((el) => {
    return el.textContent;
  }, rateElement);

  const tvlElement = await page.waitForSelector(
    'xpath/(//*[contains(., "APR") and contains(., "USDC") and contains(., "Deposits")])[last()]//p[contains(., "Deposits")]/following-sibling::*[1]/*[last()]',
  );
  const tvl = await page.evaluate((el) => {
    return el.textContent;
  }, tvlElement);

  await browser.close();

  const results = {
    id: "save-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "save",
    name: "USDC",
    rate: parseFloat(rate),
    tvl: parseFloat(tvl) * 1000000,
  };

  console.log(results);

  fs.writeFileSync("save-usdc.json", JSON.stringify(results) + "\n");
})();

