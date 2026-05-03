import { MarketRiskSignal, MorphoMarketPosition } from "./types.js";

export function evaluatePositionRisk(p: MorphoMarketPosition): MarketRiskSignal {
  const ltv = p.collateralUsd > 0 ? p.borrowAssetsUsd / p.collateralUsd : null;

  let riskLevel: "safe" | "watch" | "critical" = "safe";
  let action: "monitor" | "investigate" | "prepare_execution" = "monitor";

  if (p.healthFactor !== null) {
    if (p.healthFactor <= 1.05) {
      riskLevel = "critical";
      action = "prepare_execution";
    } else if (p.healthFactor <= 1.2) {
      riskLevel = "watch";
      action = "investigate";
    }
  }

  const estimatedProfit =
    riskLevel === "critical"
      ? p.borrowAssetsUsd * 0.05
      : 0;

  return {
    type: "market_risk_signal",
    marketId: p.marketId,
    userAddress: p.userAddress,
    riskLevel,
    action,
    reason:
      riskLevel === "critical"
        ? "Liquidation candidate (HF near 1)"
        : riskLevel === "watch"
        ? "Position approaching risk"
        : "Healthy position",
    healthFactor: p.healthFactor,
    currentLtv: ltv,
    liquidationLtv: p.lltv,
    borrowAssetsUsd: p.borrowAssetsUsd,
    collateralUsd: p.collateralUsd,
    estimatedProfitUsd: estimatedProfit,
    executionEnabled: false,
    timestamp: new Date().toISOString()
  };
}
