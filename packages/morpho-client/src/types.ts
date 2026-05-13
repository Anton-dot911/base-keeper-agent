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

export type LiquidationTxCandidate = {
  type: "liquidation_tx_candidate";
  marketId: string;
  borrower: string | null;
  targetContract: string;
  functionName: "liquidate";
  calldataReady: boolean;
  reason: string;
};

export type PreExecutionSimulation = {
  type: "pre_execution_simulation";
  status:
    | "ready_for_tx_simulation"
    | "health_factor_unavailable"
    | "not_liquidatable"
    | "simulation_not_eligible"
    | "not_profitable"
    | "low_confidence";
  txCandidate: LiquidationTxCandidate | null;
  estimatedBundleGasUsd: number;
  estimatedNetAfterBundleUsd: number;
  reason: string;
};

export type TxSimulationResult = {
  type: "tx_simulation_result";
  mode: "skeleton" | "anvil" | "sepolia" | "mainnet_shadow";
  status:
    | "skipped"
    | "calldata_not_ready"
    | "ready_not_simulated"
    | "simulated_success"
    | "simulated_revert"
    | "simulation_error";
  attempted: boolean;
  simulated: boolean;
  passed: boolean;
  wouldRevert: boolean | null;
  gasEstimateUsd: number;
  netAfterSimulationUsd: number;
  reason: string;
};

export type PaymasterPolicyDecision = {
  type: "paymaster_policy_decision";
  mode: "dry_run";
  sponsor: boolean;
  policyEnabled: boolean;
  killSwitchActive: boolean;
  reason: string;
  blockedBy: string[];
  minNetProfitUsd: number;
  maxGasUsd: number;
  maxGasToProfitRatio: number;
  dailyBudgetUsd: number;
  dailyBudgetUsedUsd: number;
  gasToProfitRatio: number | null;
  timestamp: string;
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
  preExecution: PreExecutionSimulation;
  txSimulation: TxSimulationResult;
  paymasterPolicy: PaymasterPolicyDecision;
  executionEnabled: false;
  timestamp: string;
};

export type ShadowMorphoScanResult = {
  marketsScanned: number;
  positionsScanned: number;
  opportunitiesFound: number;
  liquidatablePositions: number;
  profitableSimulations: number;
  preExecutionReady: number;
  txSimulationReady: number;
  paymasterSponsorReady: number;
  totalEstimatedNetProfitUsd: number;
  riskSignals: MarketRiskSignal[];
};
