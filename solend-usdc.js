const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://solend.fi/dashboard");

  // Find USDC row
  const trElement = await page.waitForSelector(
    'xpath///table// *[contains(text(), "USDC")]/ancestor::tr',
  );
  const [, , tvl, rate] = await page.evaluate((el) => {
    const tdElements = el.querySelectorAll("td");
    return Array.from(tdElements).map((el) => el.textContent.trim());
  }, trElement);

  await browser.close();

  const results = {
    id: "solend-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "solend",
    name: "USDC",
    rate: parseFloat(rate.split(" ").at(-1)),
    tvl: parseFloat(tvl.replaceAll(",", "")) * 1000000,
  };
  fs.writeFileSync("solend-usdc.json", JSON.stringify(results) + "\n");
})();
