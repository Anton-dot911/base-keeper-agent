import type { PositionHealthInput, RiskLevel } from "./types.js";

export function calculateHealthFactor(input: PositionHealthInput): number {
  if (input.debtValueUsd <= 0) return Number.POSITIVE_INFINITY;
  return (input.collateralValueUsd * input.lltv) / input.debtValueUsd;
}

export function classifyHealthFactor(healthFactor: number): RiskLevel {
  if (healthFactor <= 1) return "high";
  if (healthFactor <= 1.05) return "medium";
  return "low";
}

export function isLiquidatable(healthFactor: number): boolean {
  return healthFactor <= 1;
}
