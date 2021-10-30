const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://dex.aldrin.com/pools", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const element of document.querySelectorAll(
      "[class*='Addressbook__Text']"
    )) {
      if (element.textContent.includes("%")) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("[class*='Tablestyles__StyledTable'] tbody tr")
    .map(function (i, el) {
      return {
        name: $(el).find("td:first-child").first().text(),
        apr: $(el).find("td:nth-child(6)").first().text() ?? "",
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Aldrin",
    timetamp: timestamp.toISOString(),
    url: "https://dex.aldrin.com/pools",
  };
  fs.writeFileSync("aldrin.json", JSON.stringify(results, null, 2) + "\n");
})();