const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://suilend.fi/dashboard");

  const trElement = await page.waitForSelector(
    `xpath/(//table// *[text() = "USDC"]/ancestor::tr)`,
  );
  const [, tvl, , , rate] = await page.evaluate((el) => {
    const tdElements = el.querySelectorAll("td");
    return Array.from(tdElements).map((el) => el.textContent.trim());
  }, trElement);

  await browser.close();

  const results = {
    id: "suilend-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "suilend",
    name: "USDC",
    rate: parseFloat(rate),
    tvl: parseFloat(tvl) * 1000000,
  };

  console.log(results);

  fs.writeFileSync("suilend-usdc.json", JSON.stringify(results) + "\n");
})();
