const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const userAgent = require("user-agents");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(userAgent.toString());
  await page.goto("https://mainnet.port.finance/#/supply", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(
    () => {
      for (const em of document.querySelectorAll("em")) {
        if (em.textContent === "+" && parseFloat(em.nextSibling.textContent)) {
          return true;
        }
      }
    },
    {
      polling: "mutation",
      timeout: 30000,
    }
  );
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("tbody")
    .children()
    .map(function (i, el) {
      return {
        name: $(el).find("td:first-child span").text().trim(),
        apy: $(el).find("td:last-child em").text().trim().replace(/\+$/, ''),
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
