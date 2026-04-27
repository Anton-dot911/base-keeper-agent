import type { ProfitabilityInput } from "./types.js";

export function estimateNetProfitUsd(input: ProfitabilityInput): number {
  return input.estimatedCollateralSeizedUsd - input.estimatedDebtRepaidUsd - input.estimatedGasUsd;
}

export function passesProfitFloor(input: ProfitabilityInput): boolean {
  return estimateNetProfitUsd(input) >= input.minNetProfitUsd;
}
