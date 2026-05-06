import type { MarketRiskSignal } from "../../morpho-client/src/types.js";

export type CopilotRiskDistribution = {
  safe: number;
  watch: number;
  critical: number;
};

export type CopilotTopSignal = {
  marketId: string;
  userAddress: string | null;
  riskLevel: MarketRiskSignal["riskLevel"];
  action: MarketRiskSignal["action"];
  healthFactor: number | null;
  netProfitUsd: number;
  confidence: MarketRiskSignal["simulation"]["confidence"];
  reason: string;
};

export type CopilotSummary = {
  type: "copilot_summary";
  agentStatus: "healthy" | "warning" | "critical";
  marketsScanned: number;
  positionsScanned: number;
  riskSignals: number;
  riskDistribution: CopilotRiskDistribution;
  opportunitiesFound: number;
  liquidatablePositions: number;
  profitableSimulations: number;
  executionReady: number;
  estimatedNetProfitUsd: number;
  minHealthFactor: number | null;
  mainReason: string;
  recommendedAction:
    | "continue_monitoring"
    | "review_watchlist"
    | "investigate_critical_signals"
    | "prepare_tx_simulation"
    | "check_data_source";
  topSignals: CopilotTopSignal[];
  timestamp: string;
};
