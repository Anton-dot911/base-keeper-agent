import type { ConfiguredMarket } from "./market-config.js";
import { evaluateMarketRisk } from "./risk-engine.js";
import type { ShadowMorphoScanResult } from "./types.js";

export async function runShadowMorphoScan({
  markets
}: {
  client: unknown;
  markets: ConfiguredMarket[];
}): Promise<ShadowMorphoScanResult> {
  const riskSignals = markets.map((m) => evaluateMarketRisk(m.id));

  const opportunitiesFound = riskSignals.filter(
    (r) => r.riskLevel !== "safe"
  ).length;

  return {
    marketsScanned: markets.length,
    opportunitiesFound,
    liquidatablePositions: 0,
    riskSignals
  };
}
