const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://lifinity.io/pools/", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll("tr")) {
      if (div.textContent.includes("$")) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $(".ant-table-row")
    .map(function (i, el) {
      const name = $(el).find(".pool-title");
      return {
        name: name.text().trim(),
        apr:
          $(el)
            .find("td:nth-child(7)")
            .text()
            .match(/[\d.]+%/)?.[0] ?? "",
      };
    })
    .toArray()
    .filter(function ({ name }) {
      return !name.includes("CPMM") && !name.includes("CLMM");
    });

  console.log(data);

  const results = {
    data,
    name: "Lifinity",
    timetamp: timestamp.toISOString(),
    url: "https://lifinity.io/pools/",
  };
  fs.writeFileSync("lifinity.json", JSON.stringify(results) + "\n");
})();