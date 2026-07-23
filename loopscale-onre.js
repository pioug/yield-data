const fs = require("node:fs");

const API_URL = "https://tars.loopscale.com/v1/markets";
const LENDING_VAULT_ADDRESS = "7PeYxZpM2dpc4RRDQovexMJ6tkSVLWtRN4mbNywsU3e6";
const EARN_VAULT_ADDRESS = "9iPUphFXxnyAKYnCTG3XZv5ybHv5Ki1diqA5mis3TBVB";
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      origin: "https://app.loopscale.com",
      referer: "https://app.loopscale.com/",
      ...options.headers,
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`Loopscale API ${path} returned ${response.status}`);
  }

  return response.json();
}

function fromBaseUnits(value, decimals) {
  return Number(value) / 10 ** decimals;
}

function getCurrentSupply(vault, principalDecimals, timestampSeconds) {
  const strategy = vault.vaultStrategy.strategy;
  const interestFee = Number(strategy.interestFee) / 1e6;
  const interestPerSecond = fromBaseUnits(strategy.interestPerSecond, principalDecimals);
  const accruedInterest =
    interestPerSecond * Math.max(0, timestampSeconds - Number(strategy.lastAccruedTimestamp));
  const fees =
    accruedInterest * interestFee + fromBaseUnits(strategy.feeClaimable, principalDecimals);

  return Math.max(
    0,
    fromBaseUnits(strategy.currentDeployedAmount, principalDecimals) +
      accruedInterest +
      fromBaseUnits(strategy.outstandingInterestAmount, principalDecimals) +
      fromBaseUnits(vault.vaultStrategy.externalYieldInfo?.balance ?? 0, principalDecimals) +
      fromBaseUnits(strategy.tokenBalance, principalDecimals) -
      fees,
  );
}

function getLendingRate(vault, tokens, prices, collateralYields, timestampSeconds) {
  const strategy = vault.vaultStrategy.strategy;
  const principal = tokens[strategy.principalMint];
  const principalPrice = prices[strategy.principalMint].spotPrice;
  const interestFee = Number(strategy.interestFee) / 1e6;
  const deployed = fromBaseUnits(strategy.currentDeployedAmount, principal.decimals);
  const idle = fromBaseUnits(strategy.tokenBalance, principal.decimals);
  const externalBalance = fromBaseUnits(
    vault.vaultStrategy.externalYieldInfo?.balance ?? 0,
    principal.decimals,
  );
  const totalBalance = deployed + idle + externalBalance;
  const fixedApy =
    ((fromBaseUnits(strategy.interestPerSecond, principal.decimals) * SECONDS_PER_YEAR) /
      deployed) *
    (1 - interestFee);
  const externalApy = Number(vault.vaultStrategy.externalYieldInfo?.apy ?? 0) / 1e6;
  const baseApy =
    fixedApy * (deployed / totalBalance) +
    externalApy * (externalBalance / totalBalance) * (1 - interestFee);
  const tvl = getCurrentSupply(vault, principal.decimals, timestampSeconds) * principalPrice;
  const rewardsApy = vault.vaultRewardsSchedules
    .filter(
      (reward) =>
        Number(reward.rewardStartTime) < timestampSeconds &&
        Number(reward.rewardEndTime) > timestampSeconds,
    )
    .reduce((total, reward) => {
      const rewardToken = tokens[reward.rewardMint];
      const rewardPrice = prices[reward.rewardMint].spotPrice;
      const emissionsPerSecond = fromBaseUnits(reward.emissionsPerSecond, rewardToken.decimals);

      return total + (emissionsPerSecond * SECONDS_PER_YEAR * rewardPrice) / tvl;
    }, 0);
  const collateralApy = (collateralYields[strategy.principalMint] ?? 0) / 100;

  return { rate: (baseApy + rewardsApy + collateralApy) * 100, tvl };
}

(async () => {
  const timestamp = new Date(process.env.SCRAPE_TIMESTAMP ?? Date.now());
  const timestampSeconds = timestamp.getTime() / 1000;
  const lendingRequest = {
    includeStrategySummaries: true,
    page: 0,
    pageSize: 1,
    sortDirection: 1,
    sortType: 0,
    vaultAddresses: [LENDING_VAULT_ADDRESS],
  };
  const [lendingResponse, earnVaults, tokens, prices, collateralYields] = await Promise.all([
    fetchJson("/lending_vaults/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lendingRequest),
    }),
    fetchJson("/earn/vaults"),
    fetchJson("/tokens"),
    fetchJson("/prices"),
    fetchJson("/loop/collateral_yield/latest/mints", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]),
    }),
  ]);
  const lendingVault = lendingResponse.lendVaults.find(
    (vault) => vault.vault.address === LENDING_VAULT_ADDRESS,
  );
  const earnVault = earnVaults.find((vault) => vault.address === EARN_VAULT_ADDRESS);

  if (!lendingVault || !earnVault) {
    throw new Error("Unable to find Loopscale OnRe vaults");
  }

  const lending = getLendingRate(lendingVault, tokens, prices, collateralYields, timestampSeconds);
  const results = [
    {
      id: "loopscale-usdc-onre",
      timestamp: timestamp.toISOString(),
      protocol: "loopscale",
      name: "USDC (OnRe)",
      rate: lending.rate,
      tvl: lending.tvl,
    },
    {
      id: "loopscale-onre-growth",
      timestamp: timestamp.toISOString(),
      protocol: "loopscale",
      name: "USDC (OnRe Growth)",
      rate:
        (earnVault.latestSnapshot.displayApyBps + (earnVault.latestSnapshot.rewardsApyBps ?? 0)) /
        100,
      tvl: fromBaseUnits(
        earnVault.latestSnapshot.totalAumAssets,
        tokens[earnVault.acceptedAssetMint].decimals,
      ),
    },
  ];

  for (const result of results) {
    console.log(result);
    fs.writeFileSync(`${result.id}.json`, JSON.stringify(result) + "\n");
  }
})();
