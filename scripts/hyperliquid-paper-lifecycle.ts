import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  buildPaperLifecycleReport,
  type HyperliquidWatchlistReport
} from "../packages/hyperliquid-intel/src/index.js";

function parseNumberList(value: string | undefined, fallback: number[]): number[] {
  if (!value) return fallback;

  const parsed = value
    .split(/[,\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0);

  return parsed.length > 0 ? parsed : fallback;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main(): Promise<void> {
  const inputPath = process.env.HYPERLIQUID_WATCHLIST_REPORT_PATH || "data/hyperliquid-watchlist-report.json";
  const outputPath = process.env.HYPERLIQUID_PAPER_LIFECYCLE_REPORT_PATH || "data/hyperliquid-paper-lifecycle-report.json";
  const checkpointScheduleSeconds = parseNumberList(
    process.env.HYPERLIQUID_PAPER_LIFECYCLE_CHECKPOINT_SECONDS,
    [0, 60, 300]
  );
  const maxPositions = parseNumber(process.env.HYPERLIQUID_PAPER_LIFECYCLE_MAX_POSITIONS, 10);
  const infoUrl = process.env.HYPERLIQUID_INFO_URL;

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_paper_lifecycle_started",
        inputPath,
        outputPath,
        checkpointScheduleSeconds,
        maxPositions
      },
      null,
      2
    )
  );

  const source = await readFile(resolve(inputPath), "utf8");
  const watchlistReport = JSON.parse(source) as HyperliquidWatchlistReport;

  const report = await buildPaperLifecycleReport({
    watchlistReport,
    checkpointScheduleSeconds,
    maxPositions,
    ...(infoUrl ? { infoUrl } : {})
  });

  const absoluteOutputPath = resolve(outputPath);
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_paper_lifecycle_completed",
        positionsTracked: report.positionsTracked,
        pricedPositions: report.pricedPositions,
        winningPositions: report.winningPositions,
        losingPositions: report.losingPositions,
        totalFinalEstimatedPnlUsd: report.totalFinalEstimatedPnlUsd,
        averageFinalEstimatedReturnBps: report.averageFinalEstimatedReturnBps,
        outputPath: absoluteOutputPath,
        positions: report.positions.slice(0, 20)
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ type: "hyperliquid_paper_lifecycle_failed", error: message }, null, 2));
  process.exit(1);
});
