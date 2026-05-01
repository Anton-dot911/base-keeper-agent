import type { ConfiguredMarket } from "./market-config.js";

export async function runShadowMorphoScan({
  markets
}: {
  client: unknown;
  markets: ConfiguredMarket[];
}) {
  return {
    marketsScanned: markets.length,
    opportunitiesFound: 0,
    liquidatablePositions: 0
  };
}
