export type RiskLevel = "safe" | "watch" | "critical";

export type ConfiguredMarket = {
  id: string;
};

export type MorphoMarketPosition = {
  userAddress: string;
  marketId: string;
  borrowAssetsUsd: number;
  collateralUsd: number;
  lltv: number | null;
  healthFactor: number | null;
};

export type LiquidationSimulation = {
  type: "liquidation_simulation";
  eligible: boolean;
  profitable: boolean;
  liquidationBonusBps: number;
  grossProfitUsd: number;
  estimatedGasCostUsd: number;
  protocolBufferUsd: number;
  netProfitUsd: number;
  confidence: "low" | "medium" | "high";
  reason: string;
};

export type MarketRiskSignal = {
  type: "market_risk_signal";
  marketId: string;
  userAddress: string | null;
  riskLevel: RiskLevel;
  action: "monitor" | "investigate" | "prepare_execution" | "skip";
  reason: string;
  healthFactor: number | null;
  currentLtv: number | null;
  liquidationLtv: number | null;
  borrowAssetsUsd: number;
  collateralUsd: number;
  estimatedProfitUsd: number;
  simulation: LiquidationSimulation;
  executionEnabled: false;
  timestamp: string;
};

export type ShadowMorphoScanResult = {
  marketsScanned: number;
  positionsScanned: number;
  opportunitiesFound: number;
  liquidatablePositions: number;
  profitableSimulations: number;
  totalEstimatedNetProfitUsd: number;
  riskSignals: MarketRiskSignal[];
};
