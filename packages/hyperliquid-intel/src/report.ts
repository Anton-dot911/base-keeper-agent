import { fetchUserFillsByTimeChunked } from "./fills-reader.js";
import { normalizeHyperliquidFills } from "./trade-normalizer.js";
import { scoreWallet } from "./wallet-score.js";
import type { WalletIntelligenceReport } from "./types.js";

const DEFAULT_CHUNK_HOURS = 24;

export async function buildWalletIntelligenceReport({
  wallets,
  lookbackDays,
  chunkHours = DEFAULT_CHUNK_HOURS,
  infoUrl
}: {
  wallets: string[];
  lookbackDays: number;
  chunkHours?: number;
  infoUrl?: string;
}): Promise<WalletIntelligenceReport> {
  const endTime = Date.now();
  const startTime = endTime - lookbackDays * 24 * 60 * 60 * 1000;

  const scores = [];

  for (const wallet of wallets) {
    const request = infoUrl
      ? { wallet, startTime, endTime, chunkHours, infoUrl }
      : { wallet, startTime, endTime, chunkHours };

    const fills = await fetchUserFillsByTimeChunked(request);
    const trades = normalizeHyperliquidFills(wallet, fills);
    scores.push(scoreWallet(wallet, trades));
  }

  const allWallets = scores.sort((a, b) => b.consistencyScore - a.consistencyScore);

  return {
    type: "hyperliquid_wallet_intelligence_report",
    generatedAt: new Date().toISOString(),
    lookbackDays,
    chunkHours,
    walletsAnalyzed: wallets.length,
    topWallets: allWallets.slice(0, 20),
    allWallets
  };
}
