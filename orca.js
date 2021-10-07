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
        div.textContent.includes("Yearly Returns") &&
        (div.nextSibling?.textContent ?? "").includes("%")
      ) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("[class*='PoolSection__PoolList']")
    .children()
    .map(function (i, el) {
      return {
        name: $(el).find("[class*='PoolCard__MobilePoolName']").text(),
        apr: $(el)
          .find("section")
          .filter(function (i, el) {
            return $(el).text().trim() === "Yearly Returns";
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
