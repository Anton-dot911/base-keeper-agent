import type { MarketRiskSignal } from "../../morpho-client/src/types.js";
import type { PaymasterPolicyConfig, PaymasterPolicyDecision } from "./types.js";

const DEFAULT_MIN_NET_PROFIT_USD = 10;
const DEFAULT_MAX_GAS_USD = 5;
const DEFAULT_MAX_GAS_TO_PROFIT_RATIO = 0.3;
const DEFAULT_DAILY_BUDGET_USD = 50;

export function evaluatePaymasterPolicy(
  signal: MarketRiskSignal,
  config: PaymasterPolicyConfig
): PaymasterPolicyDecision {
  const policyEnabled = config.PAYMASTER_POLICY_ENABLED ?? true;
  const killSwitchActive = config.PAYMASTER_KILL_SWITCH ?? false;
  const minNetProfitUsd = config.MIN_PAYMASTER_NET_PROFIT_USD ?? DEFAULT_MIN_NET_PROFIT_USD;
  const maxGasUsd = config.MAX_PAYMASTER_GAS_USD ?? DEFAULT_MAX_GAS_USD;
  const maxGasToProfitRatio =
    config.MAX_PAYMASTER_GAS_TO_PROFIT_RATIO ?? DEFAULT_MAX_GAS_TO_PROFIT_RATIO;
  const dailyBudgetUsd = config.PAYMASTER_DAILY_BUDGET_USD ?? DEFAULT_DAILY_BUDGET_USD;
  const dailyBudgetUsedUsd = config.PAYMASTER_DAILY_SPENT_USD ?? 0;

  const gasUsd = signal.txSimulation.gasEstimateUsd || signal.preExecution.estimatedBundleGasUsd;
  const netProfitUsd =
    signal.txSimulation.netAfterSimulationUsd || signal.preExecution.estimatedNetAfterBundleUsd;
  const grossProfitUsd = signal.simulation.grossProfitUsd;
  const gasToProfitRatio = grossProfitUsd > 0 ? gasUsd / grossProfitUsd : null;

  const blockedBy: string[] = [];

  if (!policyEnabled) blockedBy.push("policy_disabled");
  if (killSwitchActive) blockedBy.push("kill_switch_active");

  if (signal.preExecution.status !== "ready_for_tx_simulation") {
    blockedBy.push(`pre_execution_${signal.preExecution.status}`);
  }

  if (!signal.txSimulation.passed) {
    blockedBy.push(`tx_simulation_${signal.txSimulation.status}`);
  }

  if (netProfitUsd < minNetProfitUsd) {
    blockedBy.push("net_profit_below_threshold");
  }

  if (gasUsd > maxGasUsd) {
    blockedBy.push("gas_above_threshold");
  }

  if (gasToProfitRatio === null || gasToProfitRatio > maxGasToProfitRatio) {
    blockedBy.push("gas_to_profit_ratio_above_threshold");
  }

  if (dailyBudgetUsedUsd + gasUsd > dailyBudgetUsd) {
    blockedBy.push("daily_budget_exceeded");
  }

  const sponsor = blockedBy.length === 0;

  return {
    type: "paymaster_policy_decision",
    mode: "dry_run",
    sponsor,
    policyEnabled,
    killSwitchActive,
    reason: sponsor
      ? "Signal passed paymaster policy checks. In dry-run mode, no sponsorship is executed."
      : buildReason(blockedBy),
    blockedBy,
    minNetProfitUsd,
    maxGasUsd,
    maxGasToProfitRatio,
    dailyBudgetUsd,
    dailyBudgetUsedUsd,
    gasToProfitRatio,
    timestamp: new Date().toISOString()
  };
}

function buildReason(blockedBy: string[]): string {
  if (blockedBy.length === 0) return "Policy passed.";

  if (blockedBy.includes("kill_switch_active")) {
    return "Paymaster sponsorship blocked because the kill switch is active.";
  }

  if (blockedBy.some((x) => x.startsWith("pre_execution_"))) {
    return "Paymaster sponsorship blocked because the signal is not ready for transaction simulation.";
  }

  if (blockedBy.some((x) => x.startsWith("tx_simulation_"))) {
    return "Paymaster sponsorship blocked because transaction simulation has not passed yet.";
  }

  if (blockedBy.includes("net_profit_below_threshold")) {
    return "Paymaster sponsorship blocked because estimated net profit is below threshold.";
  }

  if (blockedBy.includes("daily_budget_exceeded")) {
    return "Paymaster sponsorship blocked because daily budget would be exceeded.";
  }

  return `Paymaster sponsorship blocked: ${blockedBy.join(", ")}.`;
}
