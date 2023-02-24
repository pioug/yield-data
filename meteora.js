const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://app.meteora.ag/", {
    waitUntil: "networkidle0",
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("a")
    .filter(function (i, el) {
      return (
        $(el).attr("href").includes("/pools") ||
        $(el).attr("href").includes("/stable")
      );
    })
    .map(function (i, el) {
      return {
        name:
          $(el).find(".ml-5 .font-semibold").first().text() ||
          $(el).find(".ml-4 .font-semibold").first().text(),
        apy: $(el).find(".text-green-caption").last().text(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Meteora",
    timetamp: timestamp.toISOString(),
    url: "https://meteora.finance/",
  };
  fs.writeFileSync("meteora.json", JSON.stringify(results) + "\n");
})();
