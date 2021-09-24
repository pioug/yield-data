const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://app.saber.so/#/farms", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll("div")) {
      if (
        div.textContent.includes("APY") &&
        (div.nextSibling?.textContent ?? "").includes("%")
      ) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("h1")
    .filter(function (i, el) {
      return $(el).text().trim() === "Active Farms";
    })
    .next()
    .children()
    .map(function (i, el) {
      return {
        name: $(el).find("span").text(),
        apy: $(el)
          .find("div")
          .filter(function (i, el) {
            return $(el).text().trim() === "APY";
          })
          .next()
          .text(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Saber",
    timetamp: timestamp.toISOString(),
    url: "https://app.saber.so/#/farms",
  };
  fs.writeFileSync("saber.json", JSON.stringify(results, null, 2) + "\n");
})();
