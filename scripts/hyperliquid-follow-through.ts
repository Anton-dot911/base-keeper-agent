import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function nearestCheckpoint(checkpoints: any[], targetSeconds: number): any | null {
  const priced = checkpoints.filter((checkpoint) => checkpoint.estimatedReturnBps !== null && checkpoint.estimatedReturnBps !== undefined);
  if (priced.length === 0) return null;

  return priced.reduce((best, checkpoint) =>
    Math.abs(checkpoint.delaySeconds - targetSeconds) < Math.abs(best.delaySeconds - targetSeconds)
      ? checkpoint
      : best
  );
}

function profitableAt(checkpoints: any[], targetSeconds: number): boolean | null {
  const checkpoint = nearestCheckpoint(checkpoints, targetSeconds);
  if (!checkpoint) return null;
  return Number(checkpoint.estimatedReturnBps) > 0;
}

function scorePosition(position: any): any {
  const checkpoints = Array.isArray(position.checkpoints) ? position.checkpoints : [];
  const priced = checkpoints.filter((checkpoint) => checkpoint.estimatedReturnBps !== null && checkpoint.estimatedReturnBps !== undefined);

  if (priced.length === 0) {
    return {
      ...position,
      profitableAt30s: null,
      profitableAt60s: null,
      profitableAt180s: null,
      bestCheckpointLabel: null,
      worstCheckpointLabel: null,
      followThroughScore: 0,
      lifecycleVerdict: "unpriced",
      lifecycleVerdictReasons: ["no_priced_checkpoints"]
    };
  }

  const best = priced.reduce((a, b) => Number(b.estimatedReturnBps) > Number(a.estimatedReturnBps) ? b : a);
  const worst = priced.reduce((a, b) => Number(b.estimatedReturnBps) < Number(a.estimatedReturnBps) ? b : a);
  const profitableAt30s = profitableAt(checkpoints, 30);
  const profitableAt60s = profitableAt(checkpoints, 60);
  const profitableAt180s = profitableAt(checkpoints, 180);
  const positiveChecks = [profitableAt30s, profitableAt60s, profitableAt180s].filter(Boolean).length;
  const finalReturnBps = Number(position.finalEstimatedReturnBps ?? 0);
  const maxFavorableBps = Number(best.estimatedReturnBps ?? 0);
  const maxAdverseBps = Number(worst.estimatedReturnBps ?? 0);

  let followThroughScore = 0;
  followThroughScore += positiveChecks * 25;
  if (finalReturnBps > 0) followThroughScore += 15;
  if (maxFavorableBps >= 10) followThroughScore += 10;
  if (maxAdverseBps <= -10) followThroughScore -= 15;
  if (position.copyEligibility !== "usable") followThroughScore -= 20;
  followThroughScore = Math.max(0, Math.min(100, followThroughScore));

  const lifecycleVerdictReasons: string[] = [];
  let lifecycleVerdict = "weak";

  if (position.copyEligibility !== "usable") lifecycleVerdictReasons.push("copy_not_eligible");
  if (positiveChecks === 0) lifecycleVerdictReasons.push("no_positive_follow_through");
  if (finalReturnBps < 0) lifecycleVerdictReasons.push("negative_final_return");
  if (maxAdverseBps <= -10) lifecycleVerdictReasons.push("large_adverse_move");

  if (followThroughScore >= 70 && position.copyEligibility === "usable" && finalReturnBps > 0) {
    lifecycleVerdict = "strong";
    lifecycleVerdictReasons.push("positive_multi_checkpoint_follow_through");
  } else if (followThroughScore < 40 || finalReturnBps < 0) {
    lifecycleVerdict = "negative";
  }

  return {
    ...position,
    profitableAt30s,
    profitableAt60s,
    profitableAt180s,
    bestCheckpointLabel: best.label ?? null,
    worstCheckpointLabel: worst.label ?? null,
    followThroughScore: round(followThroughScore, 2),
    lifecycleVerdict,
    lifecycleVerdictReasons
  };
}

async function main(): Promise<void> {
  const inputPath = process.env.HYPERLIQUID_PAPER_LIFECYCLE_REPORT_PATH || "data/hyperliquid-paper-lifecycle-report.json";
  const outputPath = process.env.HYPERLIQUID_FOLLOW_THROUGH_REPORT_PATH || inputPath;
  const report = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const positions = Array.isArray(report.positions) ? report.positions.map(scorePosition) : [];
  const scores = positions.map((position: any) => Number(position.followThroughScore ?? 0));

  const enriched = {
    ...report,
    strongLifecyclePositions: positions.filter((position: any) => position.lifecycleVerdict === "strong").length,
    weakLifecyclePositions: positions.filter((position: any) => position.lifecycleVerdict === "weak").length,
    negativeLifecyclePositions: positions.filter((position: any) => position.lifecycleVerdict === "negative").length,
    averageFollowThroughScore: scores.length === 0 ? null : round(scores.reduce((sum: number, value: number) => sum + value, 0) / scores.length, 2),
    positions
  };

  await writeFile(resolve(outputPath), `${JSON.stringify(enriched, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    type: "hyperliquid_follow_through_completed",
    positions: positions.length,
    strongLifecyclePositions: enriched.strongLifecyclePositions,
    weakLifecyclePositions: enriched.weakLifecyclePositions,
    negativeLifecyclePositions: enriched.negativeLifecyclePositions,
    averageFollowThroughScore: enriched.averageFollowThroughScore,
    outputPath
  }, null, 2));
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ type: "hyperliquid_follow_through_error", error: message }, null, 2));
  process.exit(1);
});
