import "dotenv/config";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function groupKey(position: any): string {
  return [
    position.wallet ?? "unknown-wallet",
    position.coin ?? "unknown-coin",
    position.direction ?? "unknown-direction"
  ].join(":");
}

function summarizePositions(positions: any[]): any {
  const priced = positions.filter((position) => position.finalEstimatedPnlUsd !== null && position.finalEstimatedPnlUsd !== undefined);
  const usable = positions.filter((position) => position.copyEligibility === "usable");
  const strong = positions.filter((position) => position.lifecycleVerdict === "strong");
  const negative = positions.filter((position) => position.lifecycleVerdict === "negative");
  const totalPnl = priced.reduce((sum, position) => sum + safeNumber(position.finalEstimatedPnlUsd), 0);
  const usablePnl = usable.reduce((sum, position) => sum + safeNumber(position.finalEstimatedPnlUsd), 0);
  const averageReturn = priced.length === 0
    ? null
    : priced.reduce((sum, position) => sum + safeNumber(position.finalEstimatedReturnBps), 0) / priced.length;
  const averageFollowThrough = positions.length === 0
    ? null
    : positions.reduce((sum, position) => sum + safeNumber(position.followThroughScore), 0) / positions.length;

  return {
    positions: positions.length,
    pricedPositions: priced.length,
    usablePositions: usable.length,
    strongLifecyclePositions: strong.length,
    negativeLifecyclePositions: negative.length,
    winRate: priced.length === 0 ? null : round(priced.filter((position) => safeNumber(position.finalEstimatedPnlUsd) > 0).length / priced.length, 4),
    strongRate: positions.length === 0 ? null : round(strong.length / positions.length, 4),
    negativeRate: positions.length === 0 ? null : round(negative.length / positions.length, 4),
    totalFinalEstimatedPnlUsd: round(totalPnl, 2),
    totalUsableFinalEstimatedPnlUsd: round(usablePnl, 2),
    averageFinalEstimatedReturnBps: averageReturn === null ? null : round(averageReturn, 2),
    averageFollowThroughScore: averageFollowThrough === null ? null : round(averageFollowThrough, 2)
  };
}

function summarizeGroups(positions: any[]): any[] {
  const groups = new Map<string, any[]>();

  for (const position of positions) {
    const key = groupKey(position);
    const existing = groups.get(key) ?? [];
    existing.push(position);
    groups.set(key, existing);
  }

  return [...groups.entries()]
    .map(([key, groupPositions]) => {
      const [wallet, coin, direction] = key.split(":");
      return {
        wallet,
        coin,
        direction,
        ...summarizePositions(groupPositions)
      };
    })
    .sort((a, b) => b.positions - a.positions || b.totalFinalEstimatedPnlUsd - a.totalFinalEstimatedPnlUsd);
}

async function readJsonl(path: string): Promise<any[]> {
  if (!existsSync(path)) return [];
  const content = await readFile(path, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function main(): Promise<void> {
  const lifecycleReportPath = resolve(process.env.HYPERLIQUID_PAPER_LIFECYCLE_REPORT_PATH || "data/hyperliquid-paper-lifecycle-report.json");
  const historyPath = resolve(process.env.HYPERLIQUID_LIFECYCLE_HISTORY_PATH || "data/hyperliquid-lifecycle-history.jsonl");
  const cumulativeReportPath = resolve(process.env.HYPERLIQUID_LIFECYCLE_CUMULATIVE_REPORT_PATH || "data/hyperliquid-lifecycle-cumulative-report.json");

  const report = JSON.parse(await readFile(lifecycleReportPath, "utf8"));
  const runId = report.generatedAt ?? new Date().toISOString();
  const currentPositions = Array.isArray(report.positions) ? report.positions : [];

  await mkdir(dirname(historyPath), { recursive: true });

  for (const position of currentPositions) {
    await appendFile(historyPath, `${JSON.stringify({ runId, sourceGeneratedAt: report.sourceGeneratedAt, position })}\n`, "utf8");
  }

  const historyRows = await readJsonl(historyPath);
  const allPositions = historyRows.map((row) => row.position).filter(Boolean);
  const cumulativeReport = {
    type: "hyperliquid_lifecycle_cumulative_report",
    generatedAt: new Date().toISOString(),
    runsObserved: new Set(historyRows.map((row) => row.runId)).size,
    ...summarizePositions(allPositions),
    byWalletCoinDirection: summarizeGroups(allPositions).slice(0, 50)
  };

  await writeFile(cumulativeReportPath, `${JSON.stringify(cumulativeReport, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    type: "hyperliquid_lifecycle_history_completed",
    runsObserved: cumulativeReport.runsObserved,
    positions: cumulativeReport.positions,
    usablePositions: cumulativeReport.usablePositions,
    strongLifecyclePositions: cumulativeReport.strongLifecyclePositions,
    negativeLifecyclePositions: cumulativeReport.negativeLifecyclePositions,
    totalFinalEstimatedPnlUsd: cumulativeReport.totalFinalEstimatedPnlUsd,
    averageFollowThroughScore: cumulativeReport.averageFollowThroughScore,
    historyPath,
    cumulativeReportPath
  }, null, 2));
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ type: "hyperliquid_lifecycle_history_error", error: message }, null, 2));
  process.exit(1);
});
