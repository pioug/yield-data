const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://kamino.com/markets", {
    waitUntil: "networkidle0",
  });

  const markets = [["kamino-usdc-main", "USDC (Main)", 0]];

  for (const market of markets) {
    const [id, name, index] = market;
    const trElement = await page.waitForSelector(
      `xpath/(//table// *[text() = "USDC"]/ancestor::tr)[${index + 1}]`,
    );
    const [, tvl, , , rate] = await page.evaluate((el) => {
      const tdElements = el.querySelectorAll("td");
      return Array.from(tdElements).map((el) => el.textContent.trim());
    }, trElement);

    const results = {
      id,
      timestamp: timestamp.toISOString(),
      protocol: "kamino",
      name,
      rate: parseFloat(rate),
      tvl: parseFloat(tvl.replace("$", "")) * 1000000,
    };

    console.log(results);

    fs.writeFileSync(id + ".json", JSON.stringify(results) + "\n");
  }

  await browser.close();
})();
