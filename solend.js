const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto("https://solend.fi/dashboard", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(
    () => {
      for (const label of document.querySelectorAll("label")) {
        if (label.textContent.includes("$")) {
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
        apy: $(el).find("td:nth-child(4) span").first().text().trim(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Solend",
    timetamp: timestamp.toISOString(),
    url: "https://solend.fi/dashboard",
  };
  fs.writeFileSync("solend.json", JSON.stringify(results) + "\n");
})();
