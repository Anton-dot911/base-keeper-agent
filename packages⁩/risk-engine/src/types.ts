export type RiskLevel = "low" | "medium" | "high";

export type PositionHealthInput = {
  collateralValueUsd: number;
  debtValueUsd: number;
  lltv: number; // Example: 0.86 means 86% LLTV.
};

export type ProfitabilityInput = {
  estimatedCollateralSeizedUsd: number;
  estimatedDebtRepaidUsd: number;
  estimatedGasUsd: number;
  minNetProfitUsd: number;
};

export type LiquidationOpportunity = {
  chainId: 8453;
  protocol: "morpho";
  marketId: string;
  borrower: `0x${string}`;
  healthFactor: number;
  debtAsset?: `0x${string}`;
  collateralAsset?: `0x${string}`;
  estimatedDebtToRepayUsd: number;
  estimatedCollateralSeizedUsd: number;
  estimatedGasUsd: number;
  estimatedNetProfitUsd: number;
  riskLevel: RiskLevel;
  blockNumber: string;
  detectedAt: string;
  executionEnabled: false;
};
