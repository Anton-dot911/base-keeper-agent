export type PaymasterPolicyConfig = {
  PAYMASTER_POLICY_ENABLED?: boolean;
  PAYMASTER_KILL_SWITCH?: boolean;
  MIN_PAYMASTER_NET_PROFIT_USD?: number;
  MAX_PAYMASTER_GAS_USD?: number;
  MAX_PAYMASTER_GAS_TO_PROFIT_RATIO?: number;
  PAYMASTER_DAILY_BUDGET_USD?: number;
  PAYMASTER_DAILY_SPENT_USD?: number;
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
