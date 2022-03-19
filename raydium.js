const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const userAgent = require("user-agents");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(userAgent.toString());
  await page.goto("https://v1.raydium.io/farms/", {
    waitUntil: "load",
  });
  await page.waitForFunction(
    () => {
      for (const div of document.querySelectorAll("div")) {
        if (
          div.textContent.includes("Total Apr") &&
          (div.parentNode.parentNode.nextSibling?.textContent ?? "").includes(
            "%"
          )
        ) {
          return true;
        }
      }
    },
    {
      polling: "mutation",
      timeout: 60000,
    }
  );
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const data = $("h2")
    .filter(function (i, el) {
      return $(el).text().trim() === "All Farms";
    })
    .parent()
    .parent()
    .next()
    .children()
    .filter(function (i, el) {
      return !$(el).attr("style");
    })
    .map(function (i, el) {
      return {
        name: $(el).find("img").parent().parent().contents()[1].data.trim(),
        apr: $(el)
          .find("div")
          .filter(function (i, el) {
            return $(el).text().trim() === "Total Apr";
          })
          .parent()
          .next()
          .text()
          .trim(),
      };
    })
    .toArray();

  console.log(data);

  const results = {
    data,
    name: "Raydium",
    timetamp: timestamp.toISOString(),
    url: "https://raydium.io/farms/",
  };
  fs.writeFileSync("raydium.json", JSON.stringify(results) + "\n");
})();
