const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://trade.bluefin.io/lend", {
    waitUntil: "domcontentloaded",
  });

  const trElement = await page.waitForSelector(`xpath/(//tr[td[normalize-space() = "USDC"]])`);
  const [, supply, , , rate] = await page.evaluate((el) => {
    const tdElements = el.querySelectorAll("td");
    return Array.from(tdElements).map((el) => el.textContent.replace(/\s+/g, "").trim());
  }, trElement);

  await browser.close();

  const [, tvl] = supply.match(/\$([\d,.]+)/) ?? [];

  const results = {
    id: "bluefin-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "bluefin",
    name: "USDC",
    rate: parseFloat(rate),
    tvl: parseFloat(tvl.replace(/,/g, "")) * 1_000_000,
  };

  console.log(results);

  fs.writeFileSync("bluefin-usdc.json", JSON.stringify(results) + "\n");
})();
