const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://app.marginfi.com/");

  // Dismiss onboarding
  await page.waitForSelector(".tabler-icon.tabler-icon-x");
  const parentElement = await page
    .$(".tabler-icon.tabler-icon-x")
    .then((el) => el.getProperty("parentNode"));
  await parentElement.click();

  // Find USDC row
  const trElement = await page.waitForSelector(
    'xpath///table// *[contains(text(), "USDC")]/ancestor::tr',
  );
  const [, , rate, , tvl] = await page.evaluate((el) => {
    const tdElements = el.querySelectorAll("td");
    return Array.from(tdElements).map((el) => el.textContent.trim());
  }, trElement);

  await browser.close();

  const results = {
    id: "marginfi-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "marginfi",
    name: "USDC",
    rate: parseFloat(rate),
    tvl: parseFloat(tvl) * 1000000,
  };
  fs.writeFileSync("marginfi-usdc.json", JSON.stringify(results) + "\n");
})();
