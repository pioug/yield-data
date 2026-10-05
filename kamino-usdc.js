const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const timestamp = new Date(process.env.SCRAPE_TIMESTAMP ?? Date.now());
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  let tvl;
  let rate;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto("https://kamino.com/borrow", {
      waitUntil: "domcontentloaded",
    });

    const marketXPath =
      '(//p[normalize-space() = "SOL/BTC Market"]/ancestor::div[div[contains(@class, "_trigger_")]])[1]';
    await page.waitForSelector(`xpath/${marketXPath}`);
    const modalClose = await page.$('[data-testid="modal-close"]');
    if (modalClose) {
      await modalClose.click();
      await page.waitForSelector('[data-testid="modal-close"]', { hidden: true });
    }

    if (!(await page.$(`xpath/${marketXPath}//table`))) {
      await page.locator(`xpath/${marketXPath}//p[normalize-space() = "SOL/BTC Market"]`).click();
    }

    const trElement = await page.waitForSelector(
      `xpath/(${marketXPath}//table//tr[td[1]//*[normalize-space() = "USDC"]])[1]`,
    );
    [, tvl, , , rate] = await trElement.evaluate((el) => {
      const tdElements = el.querySelectorAll("td");
      return Array.from(tdElements).map((el) => el.textContent.trim());
    });
  } finally {
    await browser.close();
  }

  const [, amount, suffix = ""] = tvl.match(/\$([\d,.]+)([KMB])?/);
  const results = {
    id: "kamino-usdc-main",
    timestamp: timestamp.toISOString(),
    protocol: "kamino",
    name: "USDC (SOL/BTC)",
    rate: parseFloat(rate),
    tvl: parseFloat(amount.replaceAll(",", "")) * { "": 1, K: 1e3, M: 1e6, B: 1e9 }[suffix],
  };

  if (!Number.isFinite(results.rate) || !Number.isFinite(results.tvl)) {
    throw new Error("Invalid Kamino USDC rate or total supply");
  }

  console.log(results);
  fs.writeFileSync("kamino-usdc-main.json", JSON.stringify(results) + "\n");
})();
