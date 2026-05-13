import { fetchRecentUserFills } from "./fills-reader.js";
import { normalizeHyperliquidFills } from "./trade-normalizer.js";
import type { HyperliquidWatchlistReport, HyperliquidWatchlistSignal } from "./types.js";

const DEFAULT_LOOKBACK_MINUTES = 15;
const DEFAULT_STRONG_COIN_ALLOWLIST = ["ETH", "BTC"];

function fillKey(signal: Pick<HyperliquidWatchlistSignal, "wallet" | "hash" | "oid" | "coin" | "price" | "size" | "fillTime">): string {
  return [
    signal.wallet,
    signal.hash ?? "no-hash",
    signal.oid ?? "no-oid",
    signal.coin,
    signal.price,
    signal.size,
    signal.fillTime
  ].join(":");
}

export async function buildHyperliquidWatchlistReport({
  wallets,
  lookbackMinutes = DEFAULT_LOOKBACK_MINUTES,
  strongCoins = DEFAULT_STRONG_COIN_ALLOWLIST,
  infoUrl
}: {
  wallets: string[];
  lookbackMinutes?: number;
  strongCoins?: string[];
  infoUrl?: string;
}): Promise<HyperliquidWatchlistReport> {
  const now = Date.now();
  const cutoff = now - lookbackMinutes * 60 * 1000;
  const signalsByKey = new Map<string, HyperliquidWatchlistSignal>();
  const normalizedStrongCoins = new Set(strongCoins.map((coin) => coin.toUpperCase()));

  for (const wallet of wallets) {
    const request = infoUrl ? { wallet, infoUrl } : { wallet };
    const fills = await fetchRecentUserFills(request);
    const recentTrades = normalizeHyperliquidFills(wallet, fills).filter(
      (trade) => trade.rawTime >= cutoff
    );

    for (const trade of recentTrades) {
      const strongCoin = normalizedStrongCoins.has(trade.coin.toUpperCase());
      const decision = strongCoin ? "paper_watch" : "skip";
      const reason = strongCoin
        ? "Watched wallet traded a strong historical coin. Paper-watch only; no execution."
        : "Watched wallet traded a coin outside the current strong-coin allowlist.";

      const signal: HyperliquidWatchlistSignal = {
        type: "hyperliquid_watchlist_signal",
        wallet: trade.wallet,
        coin: trade.coin,
        side: trade.side,
        price: trade.price,
        size: trade.size,
        notionalUsd: trade.notionalUsd,
        direction: trade.direction,
        hash: trade.hash,
        oid: trade.oid,
        fillTime: trade.timestamp,
        detectedAt: new Date(now).toISOString(),
        decision,
        reason
      };

      signalsByKey.set(fillKey(signal), signal);
    }
  }

  const signals = [...signalsByKey.values()].sort((a, b) =>
    a.fillTime.localeCompare(b.fillTime)
  );

  return {
    type: "hyperliquid_watchlist_report",
    generatedAt: new Date(now).toISOString(),
    lookbackMinutes,
    walletsWatched: wallets.length,
    fillsDetected: signals.length,
    signals
  };
}
