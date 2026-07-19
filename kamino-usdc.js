const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://kamino.com/borrow", {
    waitUntil: "domcontentloaded",
  });

  const trElement = await page.waitForSelector(
    'xpath/(//*[normalize-space() = "SOL/BTC Market"]/following::table[1]//tr[td[1]//*[normalize-space() = "USDC"]])[1]',
  );
  const [, tvl, , , rate] = await page.evaluate((el) => {
    const tdElements = el.querySelectorAll("td");
    return Array.from(tdElements).map((el) => el.textContent.trim());
  }, trElement);

  await browser.close();

  const [, amount, suffix = ""] = tvl.match(/\$([\d,.]+)([KMB])?/);
  const results = {
    id: "kamino-usdc-main",
    timestamp: timestamp.toISOString(),
    protocol: "kamino",
    name: "USDC (SOL/BTC)",
    rate: parseFloat(rate),
    tvl: parseFloat(amount.replaceAll(",", "")) * { "": 1, K: 1e3, M: 1e6, B: 1e9 }[suffix],
  };

  console.log(results);
  fs.writeFileSync("kamino-usdc-main.json", JSON.stringify(results) + "\n");
})();
