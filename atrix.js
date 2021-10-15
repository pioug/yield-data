const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://app.atrix.finance/#/farms", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll("div")) {
      if (div.textContent.includes("% APY")) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("p")
    .filter(function (i, el) {
      return $(el).text().trim() === "Farms";
    })
    .parent()
    .nextAll()
    .map(function (i, el) {
      return {
        name: $(el).find(".text-xl.font-medium.text-white").first().text(),
        apy:
          $(el)
            .find(".text-sm.font-medium.text-gray-300")
            .first()
            .text()
            .match(/[\d,]+%/)?.[0] ??  "",
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Atrix",
    timetamp: timestamp.toISOString(),
    url: "https://app.atrix.finance/#/farms",
  };
  fs.writeFileSync("atrix.json", JSON.stringify(results, null, 2) + "\n");
})();
