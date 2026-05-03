import { MorphoMarketPosition, LiquidationSimulation } from "./types.js";

export function simulateLiquidation(p: MorphoMarketPosition): LiquidationSimulation {
  const eligible = p.healthFactor !== null && p.healthFactor <= 1.1;

  const liquidationBonusBps = 500; // 5%
  const grossProfitUsd = eligible ? p.borrowAssetsUsd * 0.05 : 0;

  // crude gas model (Base cheap L2)
  const estimatedGasCostUsd = 0.5;

  // safety buffer (slippage, oracle delay, MEV)
  const protocolBufferUsd = grossProfitUsd * 0.3;

  const netProfitUsd = grossProfitUsd - estimatedGasCostUsd - protocolBufferUsd;

  const profitable = netProfitUsd > 1;

  let confidence: "low" | "medium" | "high" = "low";

  if (profitable && p.healthFactor !== null) {
    if (p.healthFactor < 1.02) confidence = "high";
    else if (p.healthFactor < 1.05) confidence = "medium";
  }

  return {
    type: "liquidation_simulation",
    eligible,
    profitable,
    liquidationBonusBps,
    grossProfitUsd,
    estimatedGasCostUsd,
    protocolBufferUsd,
    netProfitUsd,
    confidence,
    reason: eligible
      ? profitable
        ? "Profitable liquidation opportunity"
        : "Not profitable after gas"
      : "Position not liquidatable"
  };
}
