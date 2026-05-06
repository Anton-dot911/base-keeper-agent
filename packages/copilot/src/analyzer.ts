import type { ShadowMorphoScanResult } from "../../morpho-client/src/types.js";
import type { CopilotSummary } from "./types.js";
import { explainExecutionBlocker, toCopilotTopSignal } from "./signal-explainer.js";

export function buildCopilotSummary(scan: ShadowMorphoScanResult): CopilotSummary {
  const riskDistribution = scan.riskSignals.reduce(
    (acc, signal) => {
      acc[signal.riskLevel] += 1;
      return acc;
    },
    { safe: 0, watch: 0, critical: 0 }
  );

  const executionReadySignals = scan.riskSignals.filter(
    (signal) =>
      signal.healthFactor !== null &&
      signal.healthFactor <= 1 &&
      signal.simulation.eligible &&
      signal.simulation.profitable &&
      signal.simulation.confidence === "high" &&
      signal.simulation.netProfitUsd > 0
  );

  const healthFactors = scan.riskSignals
    .map((signal) => signal.healthFactor)
    .filter((value): value is number => value !== null);

  const minHealthFactor = healthFactors.length > 0 ? Math.min(...healthFactors) : null;

  const topSignals = [...scan.riskSignals]
    .sort((a, b) => {
      const riskRank = { critical: 3, watch: 2, safe: 1 } as const;
      const riskDelta = riskRank[b.riskLevel] - riskRank[a.riskLevel];
      if (riskDelta !== 0) return riskDelta;
      return b.simulation.netProfitUsd - a.simulation.netProfitUsd;
    })
    .slice(0, 5)
    .map(toCopilotTopSignal);

  const agentStatus =
    executionReadySignals.length > 0
      ? "critical"
      : scan.liquidatablePositions > 0 || scan.profitableSimulations > 0
        ? "warning"
        : "healthy";

  const recommendedAction =
    executionReadySignals.length > 0
      ? "prepare_tx_simulation"
      : scan.liquidatablePositions > 0
        ? "investigate_critical_signals"
        : scan.opportunitiesFound > 0
          ? "review_watchlist"
          : scan.positionsScanned === 0
            ? "check_data_source"
            : "continue_monitoring";

  const mainReason = buildMainReason(scan, executionReadySignals.length, minHealthFactor);

  return {
    type: "copilot_summary",
    agentStatus,
    marketsScanned: scan.marketsScanned,
    positionsScanned: scan.positionsScanned,
    riskSignals: scan.riskSignals.length,
    riskDistribution,
    opportunitiesFound: scan.opportunitiesFound,
    liquidatablePositions: scan.liquidatablePositions,
    profitableSimulations: scan.profitableSimulations,
    executionReady: executionReadySignals.length,
    estimatedNetProfitUsd: scan.totalEstimatedNetProfitUsd,
    minHealthFactor,
    mainReason,
    recommendedAction,
    topSignals,
    timestamp: new Date().toISOString()
  };
}

function buildMainReason(
  scan: ShadowMorphoScanResult,
  executionReady: number,
  minHealthFactor: number | null
): string {
  if (scan.positionsScanned === 0) {
    return "No positions were returned by the data source. Check market IDs, Morpho API response, or configured markets.";
  }

  if (executionReady > 0) {
    return `${executionReady} signal(s) passed the basic execution-ready filters and should move to transaction simulation.`;
  }

  if (scan.riskSignals.length === 0) {
    return "No risk signals were generated from the current scan.";
  }

  const riskiest = [...scan.riskSignals].sort((a, b) => {
    if (a.healthFactor === null) return 1;
    if (b.healthFactor === null) return -1;
    return a.healthFactor - b.healthFactor;
  })[0];

  if (riskiest) {
    return explainExecutionBlocker(riskiest);
  }

  if (minHealthFactor !== null) {
    return `Lowest observed health factor is ${minHealthFactor.toFixed(4)}, so no position is currently liquidation-ready.`;
  }

  return "All scanned positions are currently blocked by risk or simulation filters.";
}
