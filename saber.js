const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const categories = ["usd", "sol", "btc", "other"];
  const map = new Map();
  for (const category of categories) {
    const data = await getPools(browser, page, category);
    data.forEach(({ apy, name }) => {
      map.set(name, apy);
    });
  }

  await browser.close();
  const data = Array.from(map, ([name, apy]) => ({ name, apy }));

  console.log(data);

  const results = {
    data,
    name: "Saber",
    timetamp: timestamp.toISOString(),
    url: "https://app.saber.so/#/farms",
  };
  fs.writeFileSync("saber.json", JSON.stringify(results, null, 2) + "\n");
})();

async function getPools(browser, page, category) {
  await page.goto(`https://app.saber.so/#/farms/${category}`);
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

  const $ = cheerio.load(content);
  const data = $("h1")
    .filter(function (i, el) {
      return $(el).text().trim() === "Active Farms";
    })
    .parent()
    .next()
    .next()
    .children()
    .map(function (i, el) {
      const name = $(el)
        .children()
        .first()
        .children()
        .first()
        .children()
        .first()
        .children();
      name.find("a").remove();
      return {
        name: `${name.first().text()}-${name.last().text()}`,
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

    return data;
}
