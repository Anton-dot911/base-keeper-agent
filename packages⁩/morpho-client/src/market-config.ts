import type { MorphoMarketConfig } from "./types.js";

export function loadConfiguredMarkets(marketIds: string[]): MorphoMarketConfig[] {
  return marketIds.map((marketId, index) => ({
    marketId,
    label: `Configured Morpho market ${index + 1}`
  }));
}
