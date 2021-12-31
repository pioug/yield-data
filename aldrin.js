const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (["image", "stylesheet", "font"].includes(request.resourceType()))
      request.abort();
    else request.continue();
  });
  await page.goto("https://dex.aldrin.com/pools", { timeout: 300000 });
  await page.waitForFunction(
    () => {
      for (const td of document.querySelectorAll("td:nth-child(6)")) {
        if (td.textContent.includes("%")) {
          return true;
        }
      }
    },
    { timeout: 300000 }
  );

  const tabs = ["Aldrin-led Pools", "Ecosystem-led Pools", "Stable Pools"];
  const map = new Map();
  for (const tab of tabs) {
    const data = await getPools(page, tab);
    data.forEach(({ apr, name }) => {
      map.set(name, apr);
    });
  }

  await browser.close();
  const data = Array.from(map, ([name, apr]) => ({ name, apr }));

  console.log(data);

  const results = {
    data,
    name: "Aldrin",
    timetamp: timestamp.toISOString(),
    url: "https://dex.aldrin.com/pools",
  };
  fs.writeFileSync("aldrin.json", JSON.stringify(results) + "\n");
})();

async function getPools(page, tab) {
  await page.evaluate(function (tab) {
    for (const button of document.querySelectorAll("button")) {
      if (button.textContent.includes(tab)) {
        button.click();
        return;
      }
    }
  }, tab);

  const content = await page.content();

  const $ = cheerio.load(content);
  const data = $("tbody tr")
    .map(function (i, el) {
      return {
        name: $(el).find("td:first-child").first().text(),
        apr: $(el).find("td:nth-child(6)").first().text() ?? "",
      };
    })
    .toArray();

  return data;
}
