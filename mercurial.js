const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://mercurial.finance/", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll("p")) {
      if (
        div.textContent.includes("APY") &&
        (div.nextSibling?.textContent ?? "").includes("%") &&
        !(div.nextSibling?.textContent ?? "").includes("0.00%")
      ) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("p")
    .filter(function (i, el) {
      return $(el).text().trim() === "All Pools";
    })
    .parent()
    .next()
    .children()
    .map(function (i, el) {
      return {
        name: $(el).find("p").get(1).children[0].data,
        apy: $(el)
          .find("p")
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
    name: "Mercurial Finance",
    timetamp: timestamp.toISOString(),
    url: "https://mercurial.finance/",
  };
  fs.writeFileSync("mercurial.json", JSON.stringify(results) + "\n");
})();
