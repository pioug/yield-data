const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const userAgent = require("user-agents");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(userAgent.toString());
  await page.setViewport({
    width: 830,
    height: 600,
  });
  await page.goto(
    "https://mainnet.port.finance/#/lendingMarket/6T4XxKerq744sSuj3jaoV6QiZ8acirf4TrPwQzHAoSy5/markets",
    {
      waitUntil: "networkidle2",
    }
  );
  await page.waitForFunction(
    () => {
      for (const td of document.querySelectorAll("td")) {
        if (td.textContent.includes("%")) {
          return true;
        }
      }
    },
    {
      polling: "mutation",
      timeout: 30000,
    }
  );
  await page.waitForTimeout(5000);
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("tbody")
    .children(".port-design-table-row")
    .map(function (i, el) {
      return {
        name: $(el).find("td:first-child span").first().text().trim(),
        apy: $(el)
          .find("td:nth-child(3) span")
          .first()
          .text()
          .trim()
          .replace(/\+$/, ""),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Port Finance",
    timetamp: timestamp.toISOString(),
    url: "https://mainnet.port.finance/#/supply",
  };
  fs.writeFileSync("portfinance.json", JSON.stringify(results) + "\n");
})();
