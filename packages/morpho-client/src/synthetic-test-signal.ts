import type { MorphoMarketPosition } from "./types.js";

export function createSyntheticLiquidationPosition({
  marketId
}: {
  marketId: string;
}): MorphoMarketPosition {
  return {
    userAddress: "0x000000000000000000000000000000000000BEEF",
    marketId,
    borrowAssetsUsd: 1000,
    collateralUsd: 1050,
    lltv: 0.86,
    healthFactor: 0.98
  };
}
