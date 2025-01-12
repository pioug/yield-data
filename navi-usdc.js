const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://app.naviprotocol.io/");

  const usdcRow = await page.waitForSelector(
    'xpath///*[text() = "USDC"]/ancestor::tr',
  );

  const [, , rate, tvl] = await page.evaluate((el) => {
    return Array.from(el.querySelectorAll("td")).map((el) =>
      el.textContent.trim(),
    );
  }, usdcRow);

  console.log(rate, tvl);

  await browser.close();

  const results = {
    id: "navi-usdc",
    timestamp: timestamp.toISOString(),
    protocol: "navi",
    name: "USDC",
    rate: parseFloat(rate),
    tvl: parseFloat(tvl.split("$").at(-1).split(",").at(0)) * 1_000_000,
  };
  fs.writeFileSync("navi-usdc.json", JSON.stringify(results) + "\n");
})();
