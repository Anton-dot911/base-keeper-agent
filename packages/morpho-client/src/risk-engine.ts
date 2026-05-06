import { MarketRiskSignal, MorphoMarketPosition } from "./types.js";
import { simulateLiquidation } from "./simulation-engine.js";
import { simulatePreExecutionReadiness } from "./tx-simulator.js";

export function evaluatePositionRisk(p: MorphoMarketPosition): MarketRiskSignal {
  const ltv = p.collateralUsd > 0 ? p.borrowAssetsUsd / p.collateralUsd : null;

  let riskLevel: "safe" | "watch" | "critical" = "safe";
  let action: "monitor" | "investigate" | "prepare_execution" | "skip" = "monitor";

  if (p.healthFactor !== null) {
    if (p.healthFactor <= 1.05) {
      riskLevel = "critical";
      action = "prepare_execution";
    } else if (p.healthFactor <= 1.2) {
      riskLevel = "watch";
      action = "investigate";
    }
  }

  const simulation = simulateLiquidation(p);
  const preExecution = simulatePreExecutionReadiness({
    marketId: p.marketId,
    userAddress: p.userAddress,
    healthFactor: p.healthFactor,
    liquidationSimulation: simulation
  });

  // override decision with simulation
  if (riskLevel === "critical" && !simulation.profitable) {
    action = "skip";
  }

  const estimatedProfit = simulation.netProfitUsd;

  return {
    type: "market_risk_signal",
    marketId: p.marketId,
    userAddress: p.userAddress,
    riskLevel,
    action,
    reason:
      simulation.reason ||
      (riskLevel === "critical"
        ? "Liquidation candidate"
        : riskLevel === "watch"
        ? "Position approaching risk"
        : "Healthy position"),
    healthFactor: p.healthFactor,
    currentLtv: ltv,
    liquidationLtv: p.lltv,
    borrowAssetsUsd: p.borrowAssetsUsd,
    collateralUsd: p.collateralUsd,
    estimatedProfitUsd: estimatedProfit,
    simulation,
    preExecution,
    executionEnabled: false,
    timestamp: new Date().toISOString()
  };
}
