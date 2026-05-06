import type { MarketRiskSignal } from "../../morpho-client/src/types.js";

function formatNumber(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "unknown";
  return value.toFixed(digits);
}

export function explainExecutionBlocker(signal: MarketRiskSignal): string {
  if (signal.healthFactor === null) {
    return "Health factor is unavailable, so execution is blocked until fresh risk data is available.";
  }

  if (signal.healthFactor > 1) {
    return `Health factor ${formatNumber(signal.healthFactor)} is above liquidation threshold.`;
  }

  if (!signal.simulation.eligible) {
    return signal.simulation.reason || "Simulation marked the position as not eligible.";
  }

  if (!signal.simulation.profitable) {
    return signal.simulation.reason || "Simulation did not confirm positive net profit.";
  }

  if (signal.simulation.confidence !== "high") {
    return `Simulation confidence is ${signal.simulation.confidence}, not high.`;
  }

  if (signal.simulation.netProfitUsd <= 0) {
    return "Net profit is not positive after gas and buffers.";
  }

  return "Signal passed basic risk filters and should move to transaction simulation.";
}

export function toCopilotTopSignal(signal: MarketRiskSignal) {
  return {
    marketId: signal.marketId,
    userAddress: signal.userAddress,
    riskLevel: signal.riskLevel,
    action: signal.action,
    healthFactor: signal.healthFactor,
    netProfitUsd: signal.simulation.netProfitUsd,
    confidence: signal.simulation.confidence,
    reason: explainExecutionBlocker(signal)
  };
}
