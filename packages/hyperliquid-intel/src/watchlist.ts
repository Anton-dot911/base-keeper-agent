import { fetchRecentUserFills } from "./fills-reader.js";
import { normalizeHyperliquidFills } from "./trade-normalizer.js";
import type {
  HyperliquidTradeEvent,
  HyperliquidWatchlistReport,
  HyperliquidWatchlistSignal,
  NormalizedHyperliquidTrade
} from "./types.js";

const DEFAULT_LOOKBACK_MINUTES = 15;
const DEFAULT_STRONG_COIN_ALLOWLIST = ["ETH", "BTC"];
const DEFAULT_MIN_EVENT_NOTIONAL_USD = 500;
const EVENT_BUCKET_MS = 10_000;

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

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

function eventKindFromDirection(direction: string | null): "entry" | "exit" | "unknown" {
  if (!direction) return "unknown";

  const normalized = direction.toLowerCase();

  if (normalized.startsWith("open")) return "entry";
  if (normalized.startsWith("close")) return "exit";

  return "unknown";
}

function eventKey(trade: NormalizedHyperliquidTrade): string {
  const bucket = Math.floor(trade.rawTime / EVENT_BUCKET_MS);
  return [trade.wallet, trade.coin, trade.direction ?? "unknown", trade.side, bucket].join(":");
}

function buildAggregatedEvents({
  trades,
  strongCoins,
  minEventNotionalUsd
}: {
  trades: NormalizedHyperliquidTrade[];
  strongCoins: Set<string>;
  minEventNotionalUsd: number;
}): HyperliquidTradeEvent[] {
  const grouped = new Map<string, NormalizedHyperliquidTrade[]>();

  for (const trade of trades) {
    const key = eventKey(trade);
    const existing = grouped.get(key) ?? [];
    existing.push(trade);
    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .map((eventTrades) => {
      const sortedTrades = eventTrades.sort((a, b) => a.rawTime - b.rawTime);
      const firstTrade = sortedTrades[0];
      const totalSize = sortedTrades.reduce((sum, trade) => sum + trade.size, 0);
      const totalNotionalUsd = sortedTrades.reduce((sum, trade) => sum + trade.notionalUsd, 0);
      const averagePrice = totalSize > 0 ? totalNotionalUsd / totalSize : firstTrade.price;
      const eventKind = eventKindFromDirection(firstTrade.direction);
      const strongCoin = strongCoins.has(firstTrade.coin.toUpperCase());
      const meaningfulSize = totalNotionalUsd >= minEventNotionalUsd;
      const decision =
        strongCoin && meaningfulSize && eventKind === "entry"
          ? "paper_entry"
          : strongCoin && meaningfulSize && eventKind === "exit"
            ? "paper_exit"
            : "skip";
      const reason =
        decision === "paper_entry"
          ? "Watched wallet opened a meaningful position on a strong historical coin. Paper-entry only; no execution."
          : decision === "paper_exit"
            ? "Watched wallet closed a meaningful position on a strong historical coin. Paper-exit only; no execution."
            : !strongCoin
              ? "Event coin is outside the current strong-coin allowlist."
              : !meaningfulSize
                ? "Aggregated event notional is below the configured threshold."
                : "Event direction is not a clear open/close action.";

      return {
        type: "hyperliquid_trade_event" as const,
        wallet: firstTrade.wallet,
        coin: firstTrade.coin,
        direction: firstTrade.direction ?? "unknown",
        side: firstTrade.side,
        eventKind,
        decision,
        reason,
        fills: sortedTrades.length,
        totalSize: round(totalSize, 8),
        totalNotionalUsd: round(totalNotionalUsd, 2),
        averagePrice: round(averagePrice, 6),
        firstFillTime: sortedTrades[0].timestamp,
        lastFillTime: sortedTrades[sortedTrades.length - 1].timestamp,
        oids: [...new Set(sortedTrades.map((trade) => trade.oid).filter((oid): oid is number => oid !== null))],
        hashes: [
          ...new Set(
            sortedTrades
              .map((trade) => trade.hash)
              .filter((hash): hash is string => Boolean(hash) && hash !== "0x0000000000000000000000000000000000000000000000000000000000000000")
          )
        ]
      };
    })
    .sort((a, b) => a.firstFillTime.localeCompare(b.firstFillTime));
}

export async function buildHyperliquidWatchlistReport({
  wallets,
  lookbackMinutes = DEFAULT_LOOKBACK_MINUTES,
  strongCoins = DEFAULT_STRONG_COIN_ALLOWLIST,
  minEventNotionalUsd = DEFAULT_MIN_EVENT_NOTIONAL_USD,
  infoUrl
}: {
  wallets: string[];
  lookbackMinutes?: number;
  strongCoins?: string[];
  minEventNotionalUsd?: number;
  infoUrl?: string;
}): Promise<HyperliquidWatchlistReport> {
  const now = Date.now();
  const cutoff = now - lookbackMinutes * 60 * 1000;
  const signalsByKey = new Map<string, HyperliquidWatchlistSignal>();
  const normalizedStrongCoins = new Set(strongCoins.map((coin) => coin.toUpperCase()));
  const recentTrades: NormalizedHyperliquidTrade[] = [];

  for (const wallet of wallets) {
    const request = infoUrl ? { wallet, infoUrl } : { wallet };
    const fills = await fetchRecentUserFills(request);
    const walletRecentTrades = normalizeHyperliquidFills(wallet, fills).filter(
      (trade) => trade.rawTime >= cutoff
    );

    recentTrades.push(...walletRecentTrades);

    for (const trade of walletRecentTrades) {
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

  const events = buildAggregatedEvents({
    trades: recentTrades,
    strongCoins: normalizedStrongCoins,
    minEventNotionalUsd
  });

  return {
    type: "hyperliquid_watchlist_report",
    generatedAt: new Date(now).toISOString(),
    lookbackMinutes,
    walletsWatched: wallets.length,
    fillsDetected: signals.length,
    eventsDetected: events.length,
    paperEntryEvents: events.filter((event) => event.decision === "paper_entry").length,
    paperExitEvents: events.filter((event) => event.decision === "paper_exit").length,
    signals,
    events
  };
}
