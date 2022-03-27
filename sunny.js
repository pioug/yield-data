const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://app.sunny.ag/pools", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll("div")) {
      if (
        div.textContent.includes("APY") &&
        (div.previousSibling?.textContent ?? "").includes("%")
      ) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("div")
    .filter(function (i, el) {
      return $(el).text().trim() === "Total Value Locked";
    })
    .parent()
    .parent()
    .parent()
    .map(function (i, el) {
      return {
        name: $(el).find("img").parent().next().text(),
        apy: $(el)
          .find("div")
          .filter(function (i, el) {
            return $(el).text().trim() === "APY";
          })
          .prev()
          .text(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Sunny",
    timetamp: timestamp.toISOString(),
    url: "https://app.sunny.ag/",
  };
  fs.writeFileSync("sunny.json", JSON.stringify(results) + "\n");
})();
