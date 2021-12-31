const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://cropper.finance/farms");
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll("div")) {
      if ((div.nextSibling?.textContent ?? "").includes("%")) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $(".ant-collapse-item")
    .map(function (i, el) {
      return {
        name: $(el).find(".icons").text().trim().replace(/\s*/g, ""),
        apr: $(el)
          .find(".value")
          .filter(function (i, el) {
            return $(el).text().includes("Total apr");
          })
          .contents()
          .last()
          .text(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Cropper Finance",
    timetamp: timestamp.toISOString(),
    url: "https://cropper.finance/farms",
  };
  fs.writeFileSync("cropper.json", JSON.stringify(results) + "\n");
})();
