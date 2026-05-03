import type { ConfiguredMarket } from "./market-config.js";
import { fetchMorphoMarketPositions } from "./market-reader.js";
import { evaluatePositionRisk } from "./risk-engine.js";
import type { ShadowMorphoScanResult } from "./types.js";

export async function runShadowMorphoScan({
  markets
}: {
  client: unknown;
  markets: ConfiguredMarket[];
}): Promise<ShadowMorphoScanResult> {
  const marketIds = markets.map((m) => m.id);

  const positions = await fetchMorphoMarketPositions(marketIds);

  const riskSignals = positions.map((p) => evaluatePositionRisk(p));

  const opportunitiesFound = riskSignals.filter(
    (r) => r.riskLevel !== "safe"
  ).length;

  const liquidatablePositions = riskSignals.filter(
    (r) => r.riskLevel === "critical"
  ).length;

  const profitableSimulations = riskSignals.filter(
    (r) => r.simulation.profitable
  ).length;

  const totalEstimatedNetProfitUsd = riskSignals.reduce(
    (sum, r) => sum + r.simulation.netProfitUsd,
    0
  );

  return {
    marketsScanned: markets.length,
    positionsScanned: positions.length,
    opportunitiesFound,
    liquidatablePositions,
    profitableSimulations,
    totalEstimatedNetProfitUsd,
    riskSignals
  };
}
