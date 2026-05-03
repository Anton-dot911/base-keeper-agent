export type RiskLevel = "safe" | "watch" | "critical";

export type ConfiguredMarket = {
  id: string;
};

export type MarketRiskSignal = {
  type: "market_risk_signal";
  marketId: string;
  riskLevel: RiskLevel;
  action: "monitor" | "investigate" | "prepare_execution";
  reason: string;
  healthFactor: number | null;
  estimatedProfitUsd: number;
  executionEnabled: false;
  timestamp: string;
};

export type ShadowMorphoScanResult = {
  marketsScanned: number;
  opportunitiesFound: number;
  liquidatablePositions: number;
  riskSignals: MarketRiskSignal[];
};
