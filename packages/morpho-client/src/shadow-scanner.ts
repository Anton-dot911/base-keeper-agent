import type { ConfiguredMarket } from "./market-config.js";
import { fetchMorphoMarketPositions } from "./market-reader.js";
import { evaluatePositionRisk } from "./risk-engine.js";
import { createSyntheticLiquidationPosition } from "./synthetic-test-signal.js";
import type { ShadowMorphoScanResult } from "./types.js";

export async function runShadowMorphoScan({
  markets,
  config
}: {
  client: unknown;
  markets: ConfiguredMarket[];
  config: Parameters<typeof evaluatePositionRisk>[1] & {
    SYNTHETIC_TEST_SIGNAL_ENABLED?: boolean;
    SYNTHETIC_TEST_MARKET_ID?: string;
  };
}): Promise<ShadowMorphoScanResult> {
  const marketIds = markets.map((m) => m.id);

  const livePositions = await fetchMorphoMarketPositions(marketIds);

  const positions = config.SYNTHETIC_TEST_SIGNAL_ENABLED
    ? [
        ...livePositions,
        createSyntheticLiquidationPosition({
          marketId: config.SYNTHETIC_TEST_MARKET_ID || marketIds[0] || "SYNTHETIC-MARKET"
        })
      ]
    : livePositions;

  const riskSignals = positions.map((p) => evaluatePositionRisk(p, config));

  const opportunitiesFound = riskSignals.filter(
    (r) => r.riskLevel !== "safe"
  ).length;

  const liquidatablePositions = riskSignals.filter(
    (r) => r.riskLevel === "critical"
  ).length;

  const profitableSimulations = riskSignals.filter(
    (r) => r.simulation.profitable
  ).length;

  const preExecutionReady = riskSignals.filter(
    (r) => r.preExecution.status === "ready_for_tx_simulation"
  ).length;

  const txSimulationReady = riskSignals.filter(
    (r) => r.txSimulation.passed
  ).length;

  const paymasterSponsorReady = riskSignals.filter(
    (r) => r.paymasterPolicy.sponsor
  ).length;

  const totalEstimatedNetProfitUsd = riskSignals
    .filter((r) => r.simulation.eligible || r.simulation.profitable)
    .reduce((sum, r) => sum + Math.max(0, r.simulation.netProfitUsd), 0);

  return {
    marketsScanned: markets.length,
    positionsScanned: positions.length,
    opportunitiesFound,
    liquidatablePositions,
    profitableSimulations,
    preExecutionReady,
    txSimulationReady,
    paymasterSponsorReady,
    totalEstimatedNetProfitUsd,
    riskSignals
  };
}
