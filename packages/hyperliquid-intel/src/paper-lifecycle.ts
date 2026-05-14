import { fetchAllMids } from "./market-data.js";
import type {
  HyperliquidPaperLifecycleCheckpoint,
  HyperliquidPaperLifecyclePosition,
  HyperliquidPaperLifecycleReport,
  HyperliquidTradeEvent,
  HyperliquidWatchlistReport
} from "./types.js";

const DEFAULT_TAKE_PROFIT_BPS = 25;
const DEFAULT_STOP_LOSS_BPS = -25;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function positionSideFromDirection(direction: string): "long" | "short" | "unknown" {
  const normalized = direction.toLowerCase();

  if (normalized.includes("long")) return "long";
  if (normalized.includes("short")) return "short";

  return "unknown";
}

function positionId(event: HyperliquidTradeEvent): string {
  return [
    event.wallet,
    event.coin,
    event.direction,
    event.firstFillTime,
    event.lastFillTime,
    event.averagePrice,
    event.totalSize
  ].join(":");
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

function checkpointDecision(estimatedReturnBps: number | null): {
  status: HyperliquidPaperLifecycleCheckpoint["status"];
  decision: HyperliquidPaperLifecycleCheckpoint["decision"];
} {
  if (estimatedReturnBps === null) {
    return { status: "unpriced", decision: "unpriced" };
  }

  if (estimatedReturnBps >= DEFAULT_TAKE_PROFIT_BPS) {
    return { status: "winning", decision: "paper_take_profit" };
  }

  if (estimatedReturnBps <= DEFAULT_STOP_LOSS_BPS) {
    return { status: "losing", decision: "paper_cut" };
  }

  if (estimatedReturnBps > 0) {
    return { status: "winning", decision: "paper_hold" };
  }

  if (estimatedReturnBps < 0) {
    return { status: "losing", decision: "paper_hold" };
  }

  return { status: "flat", decision: "paper_hold" };
}

function buildCheckpoint({
  event,
  label,
  delaySeconds,
  markPrice
}: {
  event: HyperliquidTradeEvent;
  label: string;
  delaySeconds: number;
  markPrice: number | null;
}): HyperliquidPaperLifecycleCheckpoint {
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
  const outcome = checkpointDecision(estimatedReturnBps);

  return {
    label,
    delaySeconds,
    checkedAt: new Date().toISOString(),
    markPrice,
    estimatedPnlUsd: estimatedPnlUsd === null ? null : round(estimatedPnlUsd, 2),
    estimatedReturnBps: estimatedReturnBps === null ? null : round(estimatedReturnBps, 2),
    status: outcome.status,
    decision: outcome.decision
  };
}

function createLifecyclePosition(event: HyperliquidTradeEvent): HyperliquidPaperLifecyclePosition {
  return {
    type: "hyperliquid_paper_lifecycle_position",
    id: positionId(event),
    wallet: event.wallet,
    coin: event.coin,
    direction: event.direction,
    positionSide: positionSideFromDirection(event.direction),
    entryPrice: event.averagePrice,
    size: event.totalSize,
    notionalUsd: event.totalNotionalUsd,
    openedAt: event.lastFillTime,
    sourceEvent: event,
    checkpoints: [],
    finalStatus: "unpriced",
    finalDecision: "unpriced",
    finalEstimatedPnlUsd: null,
    finalEstimatedReturnBps: null,
    maxFavorablePnlUsd: null,
    maxAdversePnlUsd: null
  };
}

function finalizeLifecyclePosition(
  position: HyperliquidPaperLifecyclePosition
): HyperliquidPaperLifecyclePosition {
  const finalCheckpoint = position.checkpoints[position.checkpoints.length - 1];
  const pricedPnlValues = position.checkpoints
    .map((checkpoint) => checkpoint.estimatedPnlUsd)
    .filter((pnl): pnl is number => pnl !== null);

  return {
    ...position,
    finalStatus: finalCheckpoint?.status ?? "unpriced",
    finalDecision: finalCheckpoint?.decision ?? "unpriced",
    finalEstimatedPnlUsd: finalCheckpoint?.estimatedPnlUsd ?? null,
    finalEstimatedReturnBps: finalCheckpoint?.estimatedReturnBps ?? null,
    maxFavorablePnlUsd: pricedPnlValues.length > 0 ? round(Math.max(...pricedPnlValues), 2) : null,
    maxAdversePnlUsd: pricedPnlValues.length > 0 ? round(Math.min(...pricedPnlValues), 2) : null
  };
}

export async function buildPaperLifecycleReport({
  watchlistReport,
  checkpointScheduleSeconds,
  maxPositions,
  infoUrl
}: {
  watchlistReport: HyperliquidWatchlistReport;
  checkpointScheduleSeconds: number[];
  maxPositions?: number;
  infoUrl?: string;
}): Promise<HyperliquidPaperLifecycleReport> {
  const sortedSchedule = [...new Set(checkpointScheduleSeconds)]
    .filter((seconds) => Number.isFinite(seconds) && seconds >= 0)
    .sort((a, b) => a - b);

  const entryEvents = watchlistReport.events
    .filter((event) => event.decision === "paper_entry")
    .sort((a, b) => b.totalNotionalUsd - a.totalNotionalUsd)
    .slice(0, maxPositions ?? undefined);

  const positions = entryEvents.map((event) => createLifecyclePosition(event));
  let previousDelaySeconds = 0;

  for (const delaySeconds of sortedSchedule) {
    const waitMs = Math.max(0, delaySeconds - previousDelaySeconds) * 1000;
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    const mids = await fetchAllMids({ ...(infoUrl ? { infoUrl } : {}) });

    for (const position of positions) {
      position.checkpoints.push(
        buildCheckpoint({
          event: position.sourceEvent,
          label: `${delaySeconds}s`,
          delaySeconds,
          markPrice: mids[position.coin] ?? null
        })
      );
    }

    previousDelaySeconds = delaySeconds;
  }

  const finalizedPositions = positions.map((position) => finalizeLifecyclePosition(position));
  const pricedPositions = finalizedPositions.filter((position) => position.finalEstimatedPnlUsd !== null);
  const totalFinalEstimatedPnlUsd = pricedPositions.reduce(
    (sum, position) => sum + (position.finalEstimatedPnlUsd ?? 0),
    0
  );
  const averageFinalEstimatedReturnBps =
    pricedPositions.length === 0
      ? null
      : pricedPositions.reduce(
          (sum, position) => sum + (position.finalEstimatedReturnBps ?? 0),
          0
        ) / pricedPositions.length;

  return {
    type: "hyperliquid_paper_lifecycle_report",
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: watchlistReport.generatedAt,
    checkpointScheduleSeconds: sortedSchedule,
    positionsTracked: finalizedPositions.length,
    pricedPositions: pricedPositions.length,
    winningPositions: pricedPositions.filter((position) => (position.finalEstimatedPnlUsd ?? 0) > 0).length,
    losingPositions: pricedPositions.filter((position) => (position.finalEstimatedPnlUsd ?? 0) < 0).length,
    totalFinalEstimatedPnlUsd: round(totalFinalEstimatedPnlUsd, 2),
    averageFinalEstimatedReturnBps:
      averageFinalEstimatedReturnBps === null ? null : round(averageFinalEstimatedReturnBps, 2),
    positions: finalizedPositions.sort(
      (a, b) => Math.abs(b.finalEstimatedPnlUsd ?? 0) - Math.abs(a.finalEstimatedPnlUsd ?? 0)
    )
  };
}
