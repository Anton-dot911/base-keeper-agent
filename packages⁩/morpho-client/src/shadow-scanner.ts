import type { PublicClient } from "viem";
import type { MorphoMarketConfig, MorphoScanResult } from "./types.js";

export type ShadowScannerInput = {
  client: PublicClient;
  markets: MorphoMarketConfig[];
};

/**
 * Shadow scanner placeholder.
 *
 * This deployment-ready starter proves that Railway/VPS runtime, Base RPC,
 * logging, health checks and persistence work. The actual Morpho integration
 * should be added after you choose initial markets and verify the SDK/API path.
 */
export async function runShadowMorphoScan(input: ShadowScannerInput): Promise<MorphoScanResult> {
  await input.client.getBlockNumber();

  return {
    marketsChecked: input.markets.length,
    positionsChecked: 0,
    riskyPositionsCount: 0,
    liquidationCandidatesCount: 0,
    notes: input.markets.length === 0
      ? ["No MORPHO_MARKET_IDS configured yet. Runtime is healthy; scanner is waiting for market IDs."]
      : ["Market IDs configured. Add real Morpho position reader in packages/morpho-client next."]
  };
}
