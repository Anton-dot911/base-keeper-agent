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
  const rawFeeUsd = toNumber(fill.fee);

  // Hyperliquid fee values may be negative depending on API sign convention.
  // For wallet scoring we use a conservative cost view so rebates or negative fees
  // cannot turn an otherwise losing trader into a false positive.
  const feeCostUsd = Math.abs(rawFeeUsd);

  return {
    platform: "hyperliquid",
    wallet,
    coin: fill.coin,
    side: normalizeSide(fill.side),
    price,
    size,
    notionalUsd: price * size,
    closedPnlUsd,
    rawFeeUsd,
    feeCostUsd,
    netPnlUsd: closedPnlUsd - feeCostUsd,
    timestamp: new Date(fill.time).toISOString(),
    rawTime: fill.time,
    hash: fill.hash ?? null,
    oid: fill.oid ?? null,
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
