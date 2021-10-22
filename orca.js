const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://www.orca.so/pools", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll("section")) {
      if (
        div.textContent.includes("APR") &&
        (div.nextSibling?.textContent ?? "").includes("%")
      ) {
        return true;
      }
    }
  });
  await scrollPage(page);
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("[class*='PoolCard__RowContainer']")
    .map(function (i, el) {
      return {
        name: $(el).find("[class*='PoolCard__MobilePoolName']").text(),
        apr: $(el)
          .find("section")
          .filter(function (i, el) {
            return $(el).text().trim() === "APR";
          })
          .next()
          .text(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Orca",
    timetamp: timestamp.toISOString(),
    url: "https://www.orca.so/pools",
  };
  fs.writeFileSync("orca.json", JSON.stringify(results, null, 2) + "\n");
})();

async function scrollPage(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
