import type { MarketRiskSignal } from "../../morpho-client/src/types.js";

export type PaymasterPolicySummary = {
  type: "paymaster_policy_summary";
  mode: "dry_run";
  totalSignals: number;
  sponsorReady: number;
  blocked: number;
  mainBlocker: string | null;
  blockerDistribution: Record<string, number>;
  dailyBudgetUsedUsd: number;
  dailyBudgetUsd: number;
  killSwitchActive: boolean;
  policyEnabled: boolean;
  timestamp: string;
};

export function buildPaymasterPolicySummary(
  signals: MarketRiskSignal[]
): PaymasterPolicySummary {
  const blockerDistribution: Record<string, number> = {};
  let sponsorReady = 0;

  for (const signal of signals) {
    if (signal.paymasterPolicy.sponsor) {
      sponsorReady += 1;
      continue;
    }

    for (const blocker of signal.paymasterPolicy.blockedBy) {
      blockerDistribution[blocker] = (blockerDistribution[blocker] ?? 0) + 1;
    }
  }

  const blocked = signals.length - sponsorReady;
  const mainBlocker = Object.entries(blockerDistribution).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] ?? null;

  const firstPolicy = signals[0]?.paymasterPolicy;

  return {
    type: "paymaster_policy_summary",
    mode: "dry_run",
    totalSignals: signals.length,
    sponsorReady,
    blocked,
    mainBlocker,
    blockerDistribution,
    dailyBudgetUsedUsd: firstPolicy?.dailyBudgetUsedUsd ?? 0,
    dailyBudgetUsd: firstPolicy?.dailyBudgetUsd ?? 0,
    killSwitchActive: firstPolicy?.killSwitchActive ?? false,
    policyEnabled: firstPolicy?.policyEnabled ?? true,
    timestamp: new Date().toISOString()
  };
}
