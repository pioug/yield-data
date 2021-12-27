const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const userAgent = require("user-agents");

(async () => {
  const timestamp = new Date();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(userAgent.toString());
  const rewarders = [
    "rXhAofQCT7NN9TUqigyEAUzV1uLL4boeD8CRkNBSkYk",
    "J829VB5Fi7DMoMLK7bsVGFM82cRU61BKtiPz9PNFdL7b",
    "5LAZ5rUe1CLJoKYauyVXdbG6e7nBmY2j5mJ8PnesCA8z",
    "3UqiNcE1S2MoQ1M1PvrQf3gCkM7KB1nWfZdoQckobHpz",
    "3ahWtCwoyv4HHYdDtSzSPzD8DDo6jJKqEmPJrdztFnw4",
    "9eNj2Y4YdqM9Unw8qTm8kzx1Xt64Rft8a6HjvpkPL7QJ",
    "CduAhHmZe3n5KkxhP4EjqTZjWTuptYnfXvi4ULyF7fVc",
    "GuHrjvzqDvLTB27ebd9iFKwceCxKvSswzTByDQUTsvdm",
  ];
  const map = new Map();
  for (const rewarder of rewarders) {
    const data = await getQuarries(browser, page, rewarder);
    data.forEach(({ apy, name }) => {
      map.set(name, apy);
    });
  }
  await browser.close();
  const data = Array.from(map, ([name, apy]) => ({ name, apy }));

  console.log(data);

  const results = {
    data,
    name: "Quarry",
    timetamp: timestamp.toISOString(),
    url: "https://app.quarry.so/#/rewarders",
  };
  fs.writeFileSync("quarry.json", JSON.stringify(results, null, 2) + "\n");
})();

async function getQuarries(browser, page, rewarder) {
  await page.goto(`https://app.quarry.so/#/rewarders/${rewarder}/quarries`, {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(
    () => {
      let total = 0;
      let loaded = 0;
      for (const span of document.querySelectorAll("span")) {
        if (span.textContent.includes("Rewards APY")) {
          total++;
        }
        if ((span.parentNode.nextSibling?.textContent ?? "").includes("%")) {
          loaded++;
        }
      }

      if (
        window.location.href.includes(
          "rXhAofQCT7NN9TUqigyEAUzV1uLL4boeD8CRkNBSkYk"
        )
      ) {
        loaded++;
      }

      return total > 0 && total - loaded <= 1;
    },
    {
      polling: "mutation",
      timeout: 30000,
    }
  );

  let cont = true;
  let scrolled = 0;
  let all = [];

  while (cont) {
    const content = await page.content();
    const $ = cheerio.load(content);
    const data = $('[size="28"]')
      .filter(function (i) {
        return i;
      })
      .parent()
      .parent()
      .parent()
      .map(function (i, el) {
        return {
          name: $(el).find('[size="28"] + div span:nth-child(2)').text().trim(),
          apy: $(el)
            .find("span")
            .filter(function (i, el) {
              return $(el).text().trim() === "Rewards APY";
            })
            .parent()
            .next()
            .text(),
        };
      })
      .toArray();

    const innerHeight = await page.evaluate(async function () {
      return window.innerHeight;
    });
    cont = await page.evaluate(async function (arg) {
      window.scrollBy(0, window.innerHeight);
      return arg + window.innerHeight <= document.body.scrollHeight;
    }, scrolled);

    scrolled += innerHeight;
    all = all.concat(data);
  }

  return all;
}
