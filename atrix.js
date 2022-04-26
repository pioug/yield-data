const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://app.atrix.finance/#/farms", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(() => {
    for (const div of document.querySelectorAll(
      ".self-center.font-mono.font-medium"
    )) {
      if (div.textContent.includes("%")) {
        return true;
      }
    }
  });

  let cont = true;
  let data = [];

  while (cont) {
    const content = await page.content();

    const $ = cheerio.load(content);
    const list = $("p")
      .filter(function (i, el) {
        return $(el).text().trim() === "Farm";
      })
      .parent()
      .parent()
      .nextAll("a")
      .map(function (i, el) {
        return {
          name: $(el).find(".self-center.text-base").first().text(),
          apy:
            $(el)
              .find(
                ".col-span-1.flex.flex-row.font-normal.flex.flex-row.align-center.justify-end"
              )
              .first()
              .text()
              .match(/[\d,]+%/)?.[0] ?? "",
        };
      })
      .toArray();

    cont = await page.evaluate(async function () {
      const next = document.body.querySelector(
        ".text-center.self-center.justify-self-center.mx-5.w-24"
      ).nextElementSibling;
      if (next.disabled) {
        return false;
      } else {
        next.click();
        return true;
      }
    });

    data = data.concat(list);
  }

  await browser.close();

  console.log(data);

  const results = {
    data,
    name: "Atrix",
    timetamp: timestamp.toISOString(),
    url: "https://app.atrix.finance/#/farms",
  };
  fs.writeFileSync("atrix.json", JSON.stringify(results) + "\n");
})();
