const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const userAgent = require("user-agents");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(userAgent.toString());
  await page.goto("https://tulip.garden/vaults", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll(
      ".vaults-table__row-item__asset__text-tvl"
    )) {
      if (div.textContent.includes("TVL") && div.textContent.includes("$")) {
        return true;
      }
    }
  });
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $(".vaults-table__row-item")
    .map(function (i, el) {
      return {
        name: $(el)
          .find(".vaults-table__row-item__asset__text-name")
          .contents()[0].data,
        apy: $(el).find(".vaults-table__row-item__cell span").first().text(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Tulip",
    timetamp: timestamp.toISOString(),
    url: "https://tulip.garden/vaults",
  };
  fs.writeFileSync("tulip.json", JSON.stringify(results, null, 2) + "\n");
})();
