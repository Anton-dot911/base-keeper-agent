import type { PaymasterPolicyDecision as MorphoPaymasterPolicyDecision } from "../../morpho-client/src/types.js";

export type PaymasterPolicyConfig = {
  PAYMASTER_POLICY_ENABLED?: boolean;
  PAYMASTER_KILL_SWITCH?: boolean;
  MIN_PAYMASTER_NET_PROFIT_USD?: number;
  MAX_PAYMASTER_GAS_USD?: number;
  MAX_PAYMASTER_GAS_TO_PROFIT_RATIO?: number;
  PAYMASTER_DAILY_BUDGET_USD?: number;
  PAYMASTER_DAILY_SPENT_USD?: number;
};

export type PaymasterPolicyDecision = MorphoPaymasterPolicyDecision;
