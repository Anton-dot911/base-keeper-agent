import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  buildHyperliquidWatchlistReport,
  importWatchlistFromFile,
  watchlistToWalletInput
} from "../packages/hyperliquid-intel/src/index.js";

function parseList(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(/[\n,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function resolveWallets({
  manualWallets,
  watchlistPath,
  limitWallets
}: {
  manualWallets: string[];
  watchlistPath?: string;
  limitWallets?: number;
}): Promise<string[]> {
  if (!watchlistPath) return manualWallets;

  const imported = await importWatchlistFromFile({
    path: resolve(watchlistPath),
    limitWallets
  });

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_watchlist_imported",
        source: imported.source,
        platform: imported.platform,
        walletCount: imported.walletCount,
        workflowInput: watchlistToWalletInput(imported).slice(0, 500)
      },
      null,
      2
    )
  );

  return imported.wallets.map((wallet) => wallet.address);
}

async function main(): Promise<void> {
  const manualWallets = parseList(process.env.HYPERLIQUID_WATCHLIST_WALLETS);
  const watchlistPath = process.env.HYPERLIQUID_WATCHLIST_FILE;
  const watchlistLimitWallets = parseNumber(process.env.HYPERLIQUID_WATCHLIST_LIMIT_WALLETS, 25);
  const wallets = await resolveWallets({
    manualWallets,
    ...(watchlistPath ? { watchlistPath } : {}),
    limitWallets: watchlistLimitWallets
  });
  const strongCoins = parseList(process.env.HYPERLIQUID_WATCHLIST_STRONG_COINS || "ETH,BTC");
  const lookbackMinutes = parseNumber(process.env.HYPERLIQUID_WATCHLIST_LOOKBACK_MINUTES, 15);
  const minEventNotionalUsd = parseNumber(process.env.HYPERLIQUID_WATCHLIST_MIN_EVENT_NOTIONAL_USD, 500);
  const outputPath = process.env.HYPERLIQUID_WATCHLIST_REPORT_PATH || "data/hyperliquid-watchlist-report.json";
  const infoUrl = process.env.HYPERLIQUID_INFO_URL;

  if (wallets.length === 0) {
    throw new Error("Provide HYPERLIQUID_WATCHLIST_WALLETS or HYPERLIQUID_WATCHLIST_FILE with valid wallet addresses.");
  }

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_watchlist_started",
        wallets: wallets.length,
        walletSource: watchlistPath ? "file" : "manual",
        strongCoins,
        lookbackMinutes,
        minEventNotionalUsd,
        outputPath
      },
      null,
      2
    )
  );

  const report = await buildHyperliquidWatchlistReport({
    wallets,
    strongCoins,
    lookbackMinutes,
    minEventNotionalUsd,
    ...(infoUrl ? { infoUrl } : {})
  });

  const absoluteOutputPath = resolve(outputPath);
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_watchlist_completed",
        walletsWatched: report.walletsWatched,
        fillsDetected: report.fillsDetected,
        eventsDetected: report.eventsDetected,
        paperEntryEvents: report.paperEntryEvents,
        paperExitEvents: report.paperExitEvents,
        paperWatchSignals: report.signals.filter((signal) => signal.decision === "paper_watch").length,
        outputPath: absoluteOutputPath,
        events: report.events.slice(0, 20)
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ type: "hyperliquid_watchlist_failed", error: message }, null, 2));
  process.exit(1);
});
