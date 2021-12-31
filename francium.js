const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://francium.io/app/lend", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(
    () => {
      for (const p of document.querySelectorAll(".hint")) {
        if (p.textContent.includes("%")) {
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
  const data = $("h2")
    .filter(function (i, el) {
      return $(el).text().trim() === "Active Pools";
    })
    .next()
    .find("tbody")
    .children()
    .map(function (i, el) {
      return {
        name: $(el).find("td:first-child div").text().trim(),
        apy: $(el).find("td:nth-child(2) p").text().trim(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "francium",
    timetamp: timestamp.toISOString(),
    url: "https://francium.io/app/lend",
  };
  fs.writeFileSync("francium.json", JSON.stringify(results) + "\n");
})();
