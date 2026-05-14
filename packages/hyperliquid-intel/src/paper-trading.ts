import { fetchAllMids } from "./market-data.js";
import type {
  HyperliquidPaperTrade,
  HyperliquidPaperTradingReport,
  HyperliquidTradeEvent,
  HyperliquidWatchlistReport
} from "./types.js";

const DEFAULT_TAKE_PROFIT_BPS = 25;
const DEFAULT_STOP_LOSS_BPS = -25;

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function positionSideFromDirection(direction: string): "long" | "short" | "unknown" {
  const normalized = direction.toLowerCase();

  if (normalized.includes("long")) return "long";
  if (normalized.includes("short")) return "short";

  return "unknown";
}

function estimatePnl({
  positionSide,
  entryPrice,
  markPrice,
  size
}: {
  positionSide: "long" | "short" | "unknown";
  entryPrice: number;
  markPrice: number;
  size: number;
}): number | null {
  if (positionSide === "unknown") return null;

  if (positionSide === "long") {
    return (markPrice - entryPrice) * size;
  }

  return (entryPrice - markPrice) * size;
}

function tradeDecision(estimatedReturnBps: number | null): {
  status: HyperliquidPaperTrade["status"];
  decision: HyperliquidPaperTrade["decision"];
  reason: string;
} {
  if (estimatedReturnBps === null) {
    return {
      status: "unpriced",
      decision: "unpriced",
      reason: "No current mark price was available for this coin."
    };
  }

  if (estimatedReturnBps >= DEFAULT_TAKE_PROFIT_BPS) {
    return {
      status: "winning",
      decision: "paper_take_profit",
      reason: `Estimated return is above take-profit threshold (${DEFAULT_TAKE_PROFIT_BPS} bps).`
    };
  }

  if (estimatedReturnBps <= DEFAULT_STOP_LOSS_BPS) {
    return {
      status: "losing",
      decision: "paper_cut",
      reason: `Estimated return is below stop-loss threshold (${DEFAULT_STOP_LOSS_BPS} bps).`
    };
  }

  if (estimatedReturnBps > 0) {
    return {
      status: "winning",
      decision: "paper_hold",
      reason: "Estimated paper trade is positive but below take-profit threshold."
    };
  }

  if (estimatedReturnBps < 0) {
    return {
      status: "losing",
      decision: "paper_hold",
      reason: "Estimated paper trade is negative but above stop-loss threshold."
    };
  }

  return {
    status: "flat",
    decision: "paper_hold",
    reason: "Estimated paper trade is flat."
  };
}

function paperTradeFromEvent({
  event,
  markPrice,
  now
}: {
  event: HyperliquidTradeEvent;
  markPrice: number | null;
  now: number;
}): HyperliquidPaperTrade {
  const positionSide = positionSideFromDirection(event.direction);
  const estimatedPnlUsd =
    markPrice === null
      ? null
      : estimatePnl({
          positionSide,
          entryPrice: event.averagePrice,
          markPrice,
          size: event.totalSize
        });

  const estimatedReturnBps =
    estimatedPnlUsd === null || event.totalNotionalUsd <= 0
      ? null
      : (estimatedPnlUsd / event.totalNotionalUsd) * 10_000;

  const outcome = tradeDecision(estimatedReturnBps);
  const ageMinutes = (now - Date.parse(event.lastFillTime)) / 60_000;

  return {
    type: "hyperliquid_paper_trade",
    wallet: event.wallet,
    coin: event.coin,
    direction: event.direction,
    positionSide,
    entryPrice: event.averagePrice,
    markPrice,
    size: event.totalSize,
    notionalUsd: event.totalNotionalUsd,
    estimatedPnlUsd: estimatedPnlUsd === null ? null : round(estimatedPnlUsd, 2),
    estimatedReturnBps: estimatedReturnBps === null ? null : round(estimatedReturnBps, 2),
    ageMinutes: round(ageMinutes, 2),
    status: outcome.status,
    decision: outcome.decision,
    reason: outcome.reason,
    sourceEvent: event
  };
}

export async function buildPaperTradingReport({
  watchlistReport,
  infoUrl
}: {
  watchlistReport: HyperliquidWatchlistReport;
  infoUrl?: string;
}): Promise<HyperliquidPaperTradingReport> {
  const now = Date.now();
  const mids = await fetchAllMids({ ...(infoUrl ? { infoUrl } : {}) });
  const entryEvents = watchlistReport.events.filter((event) => event.decision === "paper_entry");

  const trades = entryEvents.map((event) =>
    paperTradeFromEvent({
      event,
      markPrice: mids[event.coin] ?? null,
      now
    })
  );

  const pricedTrades = trades.filter((trade) => trade.estimatedPnlUsd !== null);
  const totalEstimatedPnlUsd = pricedTrades.reduce(
    (sum, trade) => sum + (trade.estimatedPnlUsd ?? 0),
    0
  );
  const averageEstimatedReturnBps =
    pricedTrades.length === 0
      ? null
      : pricedTrades.reduce((sum, trade) => sum + (trade.estimatedReturnBps ?? 0), 0) /
        pricedTrades.length;

  return {
    type: "hyperliquid_paper_trading_report",
    generatedAt: new Date(now).toISOString(),
    sourceGeneratedAt: watchlistReport.generatedAt,
    tradesEvaluated: trades.length,
    pricedTrades: pricedTrades.length,
    winningTrades: pricedTrades.filter((trade) => (trade.estimatedPnlUsd ?? 0) > 0).length,
    losingTrades: pricedTrades.filter((trade) => (trade.estimatedPnlUsd ?? 0) < 0).length,
    totalEstimatedPnlUsd: round(totalEstimatedPnlUsd, 2),
    averageEstimatedReturnBps:
      averageEstimatedReturnBps === null ? null : round(averageEstimatedReturnBps, 2),
    trades: trades.sort((a, b) => Math.abs(b.estimatedPnlUsd ?? 0) - Math.abs(a.estimatedPnlUsd ?? 0))
  };
}
