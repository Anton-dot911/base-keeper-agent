import type { HyperliquidFill, NormalizedHyperliquidTrade } from "./types.js";

function toNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSide(side: string): "buy" | "sell" {
  return side === "B" ? "buy" : "sell";
}

export function normalizeHyperliquidFill(
  wallet: string,
  fill: HyperliquidFill
): NormalizedHyperliquidTrade {
  const price = toNumber(fill.px);
  const size = toNumber(fill.sz);
  const closedPnlUsd = toNumber(fill.closedPnl);
  const feeUsd = toNumber(fill.fee);

  return {
    platform: "hyperliquid",
    wallet,
    coin: fill.coin,
    side: normalizeSide(fill.side),
    price,
    size,
    notionalUsd: price * size,
    closedPnlUsd,
    feeUsd,
    netPnlUsd: closedPnlUsd - feeUsd,
    timestamp: new Date(fill.time).toISOString(),
    rawTime: fill.time,
    hash: fill.hash ?? null,
    direction: fill.dir ?? null
  };
}

export function normalizeHyperliquidFills(
  wallet: string,
  fills: HyperliquidFill[]
): NormalizedHyperliquidTrade[] {
  return fills
    .map((fill) => normalizeHyperliquidFill(wallet, fill))
    .sort((a, b) => a.rawTime - b.rawTime);
}
