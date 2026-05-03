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

export type MarketRiskSignal = {
  type: "market_risk_signal";
  marketId: string;
  userAddress: string | null;
  riskLevel: RiskLevel;
  action: "monitor" | "investigate" | "prepare_execution";
  reason: string;
  healthFactor: number | null;
  currentLtv: number | null;
  liquidationLtv: number | null;
  borrowAssetsUsd: number;
  collateralUsd: number;
  estimatedProfitUsd: number;
  executionEnabled: false;
  timestamp: string;
};

export type ShadowMorphoScanResult = {
  marketsScanned: number;
  positionsScanned: number;
  opportunitiesFound: number;
  liquidatablePositions: number;
  riskSignals: MarketRiskSignal[];
};
