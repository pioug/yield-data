const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://defituna.com/lending");

  const trElement = await page.waitForSelector(
    `xpath/(//tr[contains(., 'USDC')])`,
  );
  const [, tvl, rate] = await page.evaluate((el) => {
    const tdElements = el.querySelectorAll("td");
    return Array.from(tdElements).map((el) =>
      el.textContent.trim().match(/[\d,.]+/),
    );
  }, trElement);

  await browser.close();

  const results = {
    id: "defituna-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "defituna",
    name: "USDC",
    rate: parseFloat(rate),
    tvl: parseFloat(tvl) * 1000000,
  };

  console.log(results);

  fs.writeFileSync("defituna-usdc.json", JSON.stringify(results) + "\n");
})();
