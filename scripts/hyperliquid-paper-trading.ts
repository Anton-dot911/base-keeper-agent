import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  buildPaperTradingReport,
  type HyperliquidWatchlistReport
} from "../packages/hyperliquid-intel/src/index.js";

async function main(): Promise<void> {
  const inputPath = process.env.HYPERLIQUID_WATCHLIST_REPORT_PATH || "data/hyperliquid-watchlist-report.json";
  const outputPath = process.env.HYPERLIQUID_PAPER_TRADING_REPORT_PATH || "data/hyperliquid-paper-trading-report.json";
  const infoUrl = process.env.HYPERLIQUID_INFO_URL;

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_paper_trading_started",
        inputPath,
        outputPath
      },
      null,
      2
    )
  );

  const source = await readFile(resolve(inputPath), "utf8");
  const watchlistReport = JSON.parse(source) as HyperliquidWatchlistReport;

  const report = await buildPaperTradingReport({
    watchlistReport,
    ...(infoUrl ? { infoUrl } : {})
  });

  const absoluteOutputPath = resolve(outputPath);
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_paper_trading_completed",
        tradesEvaluated: report.tradesEvaluated,
        pricedTrades: report.pricedTrades,
        winningTrades: report.winningTrades,
        losingTrades: report.losingTrades,
        totalEstimatedPnlUsd: report.totalEstimatedPnlUsd,
        averageEstimatedReturnBps: report.averageEstimatedReturnBps,
        outputPath: absoluteOutputPath,
        trades: report.trades.slice(0, 20)
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ type: "hyperliquid_paper_trading_failed", error: message }, null, 2));
  process.exit(1);
});
