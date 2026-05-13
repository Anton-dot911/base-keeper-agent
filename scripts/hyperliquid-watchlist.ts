import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { buildHyperliquidWatchlistReport } from "../packages/hyperliquid-intel/src/index.js";

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

async function main(): Promise<void> {
  const wallets = parseList(process.env.HYPERLIQUID_WATCHLIST_WALLETS);
  const strongCoins = parseList(process.env.HYPERLIQUID_WATCHLIST_STRONG_COINS || "ETH,BTC");
  const lookbackMinutes = parseNumber(process.env.HYPERLIQUID_WATCHLIST_LOOKBACK_MINUTES, 15);
  const outputPath = process.env.HYPERLIQUID_WATCHLIST_REPORT_PATH || "data/hyperliquid-watchlist-report.json";
  const infoUrl = process.env.HYPERLIQUID_INFO_URL;

  if (wallets.length === 0) {
    throw new Error("HYPERLIQUID_WATCHLIST_WALLETS is required. Provide comma, space, or newline separated wallet addresses.");
  }

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_watchlist_started",
        wallets: wallets.length,
        strongCoins,
        lookbackMinutes,
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
        paperWatchSignals: report.signals.filter((signal) => signal.decision === "paper_watch").length,
        outputPath: absoluteOutputPath,
        signals: report.signals.slice(0, 20)
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
