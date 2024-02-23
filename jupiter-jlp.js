const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://jup.ag/perps-earn");

  const rateElement = await page.waitForSelector(
    'xpath///span[starts-with(text(), "Earn") and contains(text(), "%")]',
  );
  const rate = await page.evaluate((el) => {
    return el.textContent;
  }, rateElement);
  const tvlElement = await page.waitForSelector(
    'xpath///p[contains(text(), "Total Value Locked")]/following-sibling::*[1]/p',
  );
  const tvl = await page.evaluate((el) => {
    return el.textContent;
  }, tvlElement);

  await browser.close();

  const results = {
    id: "jupiter-jlp",
    timestamp: timestamp.toISOString(),
    protocol: "jupiter",
    name: "JLP",
    rate: parseFloat(rate.replaceAll("Earn", "").replaceAll("%", "")),
    tvl: parseFloat(
      tvl.replaceAll("$", "").replaceAll(".", "").replaceAll(",", "") / 100,
    ),
  };
  fs.writeFileSync("jupiter-jlp.json", JSON.stringify(results) + "\n");
})();
