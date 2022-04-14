const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://app.crema.finance/#/farming", {
    waitUntil: "networkidle2",
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $(".farming-pool-content")
    .map(function (i, el) {
      return {
        name: $(el).find(".symbol-name").text(),
        apr:
          $(el)
            .find(".td-text")
            .first()
            .text()
            .match(/[\d.]+%/)?.[0] ?? "",
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Crema Finance",
    timetamp: timestamp.toISOString(),
    url: "https://app.crema.finance/#/farming",
  };
  fs.writeFileSync("crema.json", JSON.stringify(results) + "\n");
})();
