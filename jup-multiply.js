const fs = require("node:fs");
const puppeteer = require("puppeteer");

const AMOUNT_MULTIPLIERS = { "": 1, K: 1e3, M: 1e6, B: 1e9 };

function parseAmount(value) {
  const match = value.match(/\$([\d,.]+)([KMB])?/);

  if (!match) {
    throw new Error(`Unable to parse amount from: ${value}`);
  }

  const [, amount, suffix = ""] = match;
  return parseFloat(amount.replaceAll(",", "")) * AMOUNT_MULTIPLIERS[suffix];
}

function parsePercentage(value) {
  const match = value.match(/[+-]?([\d,.]+)%/);

  if (!match) {
    throw new Error(`Unable to parse percentage from: ${value}`);
  }

  return parseFloat(match[0].replaceAll(",", "").replace("%", ""));
}

async function getJuicedMultiply(page) {
  await page.goto("https://jup.ag/lend/multiply", { waitUntil: "domcontentloaded" });

  const element = await page.waitForSelector(`xpath/(//h3[contains(., 'JUICED')])`);
  const text = await page.evaluate((el) => el.textContent.trim(), element);
  const match = text.match(/Market Size\s*(\$[\d,.]+[KMB]?)\s*Max Net APY\s*([+-]?[\d,.]+%)/);

  if (!match) {
    throw new Error(`Unable to parse JUICED Multiply data from: ${text}`);
  }

  return { rate: parsePercentage(match[2]), tvl: parseAmount(match[1]) };
}

async function getEthenaMultiply(page) {
  await page.goto("https://jup.ag/lend/ethena/market", { waitUntil: "domcontentloaded" });

  const element = await page.waitForSelector(
    `xpath/(//h2[normalize-space()='Multiply']/following::table[1]//tr[contains(., 'USDe') and contains(., 'USDG')])[1]`,
  );
  const cells = await page.evaluate(
    (el) => Array.from(el.querySelectorAll("td")).map((cell) => cell.textContent.trim()),
    element,
  );

  if (cells.length < 4) {
    throw new Error(`Unable to parse Bitwise × Ethena Multiply data from: ${cells.join(" | ")}`);
  }

  return { rate: parsePercentage(cells[3]), tvl: parseAmount(cells[0]) };
}

(async () => {
  const timestamp = new Date(process.env.SCRAPE_TIMESTAMP ?? Date.now());
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

  try {
    const juicedPage = await browser.newPage();
    const ethenaPage = await browser.newPage();
    await Promise.all([
      juicedPage.setViewport({ width: 1920, height: 1080 }),
      ethenaPage.setViewport({ width: 1920, height: 1080 }),
    ]);

    const [juiced, ethena] = await Promise.all([
      getJuicedMultiply(juicedPage),
      getEthenaMultiply(ethenaPage),
    ]);
    const results = [
      {
        id: "jup-juiced-multiply",
        timestamp: timestamp.toISOString(),
        protocol: "jup",
        name: "JUICED (Multiply)",
        rate: juiced.rate,
        tvl: juiced.tvl,
      },
      {
        id: "jup-ethena-usde-multiply",
        timestamp: timestamp.toISOString(),
        protocol: "jup",
        name: "USDe (Bitwise × Ethena Multiply)",
        rate: ethena.rate,
        tvl: ethena.tvl,
      },
    ];

    for (const result of results) {
      console.log(result);
      fs.writeFileSync(`${result.id}.json`, JSON.stringify(result) + "\n");
    }
  } finally {
    await browser.close();
  }
})();
