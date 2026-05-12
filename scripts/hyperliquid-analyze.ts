import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { buildWalletIntelligenceReport } from "../packages/hyperliquid-intel/src/index.js";

function parseWallets(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(/[\n,\s]+/)
    .map((wallet) => wallet.trim())
    .filter(Boolean);
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main(): Promise<void> {
  const wallets = parseWallets(process.env.HYPERLIQUID_WALLETS);
  const lookbackDays = parseNumber(process.env.HYPERLIQUID_LOOKBACK_DAYS, 30);
  const outputPath = process.env.HYPERLIQUID_REPORT_PATH || "data/hyperliquid-wallet-report.json";
  const infoUrl = process.env.HYPERLIQUID_INFO_URL;

  if (wallets.length === 0) {
    throw new Error("HYPERLIQUID_WALLETS is required. Provide comma, space, or newline separated wallet addresses.");
  }

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_analysis_started",
        wallets: wallets.length,
        lookbackDays,
        outputPath
      },
      null,
      2
    )
  );

  const report = await buildWalletIntelligenceReport({
    wallets,
    lookbackDays,
    ...(infoUrl ? { infoUrl } : {})
  });

  const absoluteOutputPath = resolve(outputPath);
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        type: "hyperliquid_analysis_completed",
        walletsAnalyzed: report.walletsAnalyzed,
        topWallets: report.topWallets.slice(0, 5),
        outputPath: absoluteOutputPath
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ type: "hyperliquid_analysis_failed", error: message }, null, 2));
  process.exit(1);
});
