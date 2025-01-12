const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://app.kamino.finance/", {
    waitUntil: "networkidle0",
  });

  const markets = [
    ["kamino-usdc-jlp", "USDC (JLP)"],
    ["kamino-usdc-main", "USDC (Main)"],
    ["kamino-usdc-alt", "USDC (Alt)"],
  ];

  for (let i = 0; i < markets.length; i++) {
    const trElement = await page.waitForSelector(
      `xpath/(//table// *[text() = "USDC"]/ancestor::tr)[${i + 1}]`,
    );
    const [, tvl, , , rate] = await page.evaluate((el) => {
      const tdElements = el.querySelectorAll("td");
      return Array.from(tdElements).map((el) => el.textContent.trim());
    }, trElement);

    const [id, name] = markets[i];
    const results = {
      id,
      timestamp: timestamp.toISOString(),
      protocol: "kamino",
      name,
      rate: parseFloat(rate),
      tvl: parseFloat(tvl) * 1000000,
    };
    fs.writeFileSync(id + ".json", JSON.stringify(results) + "\n");
  }

  await browser.close();
})();
