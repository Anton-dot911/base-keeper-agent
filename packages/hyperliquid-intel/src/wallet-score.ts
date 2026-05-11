import type { NormalizedHyperliquidTrade, WalletScore } from "./types.js";

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function uniqueActiveDays(trades: NormalizedHyperliquidTrade[]): number {
  return new Set(trades.map((trade) => trade.timestamp.slice(0, 10))).size;
}

function estimateConsistencyScore({
  tradesAnalyzed,
  winRate,
  profitFactor,
  medianPnlUsd,
  totalNetPnlUsd,
  largestLossUsd,
  activeDays
}: {
  tradesAnalyzed: number;
  winRate: number;
  profitFactor: number | null;
  medianPnlUsd: number;
  totalNetPnlUsd: number;
  largestLossUsd: number;
  activeDays: number;
}): number {
  let score = 0;

  score += Math.min(25, tradesAnalyzed * 0.5);
  score += Math.min(20, activeDays * 2);
  score += Math.max(0, Math.min(25, (winRate - 0.45) * 100));
  score += profitFactor === null ? 0 : Math.max(0, Math.min(20, (profitFactor - 1) * 20));
  score += medianPnlUsd > 0 ? 10 : 0;

  if (totalNetPnlUsd <= 0) score -= 30;
  if (largestLossUsd < 0 && Math.abs(largestLossUsd) > Math.max(10, totalNetPnlUsd * 0.5)) score -= 15;

  return round(Math.max(0, Math.min(100, score)), 2);
}

export function scoreWallet(
  wallet: string,
  trades: NormalizedHyperliquidTrade[]
): WalletScore {
  const pnlValues = trades.map((trade) => trade.netPnlUsd);
  const wins = pnlValues.filter((pnl) => pnl > 0).length;
  const losses = pnlValues.filter((pnl) => pnl < 0).length;
  const grossProfitUsd = pnlValues.filter((pnl) => pnl > 0).reduce((sum, pnl) => sum + pnl, 0);
  const grossLossUsd = pnlValues.filter((pnl) => pnl < 0).reduce((sum, pnl) => sum + Math.abs(pnl), 0);
  const totalNetPnlUsd = pnlValues.reduce((sum, pnl) => sum + pnl, 0);
  const totalClosedPnlUsd = trades.reduce((sum, trade) => sum + trade.closedPnlUsd, 0);
  const totalFeesUsd = trades.reduce((sum, trade) => sum + trade.feeUsd, 0);
  const tradesAnalyzed = trades.length;
  const winRate = tradesAnalyzed > 0 ? wins / tradesAnalyzed : 0;
  const profitFactor = grossLossUsd > 0 ? grossProfitUsd / grossLossUsd : grossProfitUsd > 0 ? null : 0;
  const activeDays = uniqueActiveDays(trades);
  const medianPnlUsd = median(pnlValues);
  const averagePnlUsd = tradesAnalyzed > 0 ? totalNetPnlUsd / tradesAnalyzed : 0;
  const largestWinUsd = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
  const largestLossUsd = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;
  const lastActiveAt = trades.length > 0 ? trades[trades.length - 1].timestamp : null;

  const consistencyScore = estimateConsistencyScore({
    tradesAnalyzed,
    winRate,
    profitFactor,
    medianPnlUsd,
    totalNetPnlUsd,
    largestLossUsd,
    activeDays
  });

  const reasons: string[] = [];
  if (tradesAnalyzed < 30) reasons.push("sample_size_below_30");
  if (winRate < 0.55) reasons.push("win_rate_below_55pct");
  if ((profitFactor ?? 0) < 1.3) reasons.push("profit_factor_below_1_3");
  if (medianPnlUsd <= 0) reasons.push("median_pnl_not_positive");
  if (totalNetPnlUsd <= 0) reasons.push("total_net_pnl_not_positive");

  const recommendation =
    consistencyScore >= 75 && reasons.length === 0
      ? "candidate"
      : consistencyScore >= 50 && totalNetPnlUsd > 0
        ? "watch"
        : "skip";

  const copyRisk =
    recommendation === "candidate"
      ? "low"
      : recommendation === "watch"
        ? "medium"
        : "high";

  return {
    wallet,
    tradesAnalyzed,
    activeDays,
    lastActiveAt,
    totalClosedPnlUsd: round(totalClosedPnlUsd, 2),
    totalFeesUsd: round(totalFeesUsd, 2),
    totalNetPnlUsd: round(totalNetPnlUsd, 2),
    wins,
    losses,
    winRate: round(winRate, 4),
    averagePnlUsd: round(averagePnlUsd, 2),
    medianPnlUsd: round(medianPnlUsd, 2),
    largestWinUsd: round(largestWinUsd, 2),
    largestLossUsd: round(largestLossUsd, 2),
    grossProfitUsd: round(grossProfitUsd, 2),
    grossLossUsd: round(grossLossUsd, 2),
    profitFactor: profitFactor === null ? null : round(profitFactor, 4),
    consistencyScore,
    copyRisk,
    recommendation,
    reasons
  };
}
