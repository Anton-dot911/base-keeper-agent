import { fetchUserFillsByTime } from "./fills-reader.js";
import { normalizeHyperliquidFills } from "./trade-normalizer.js";
import { scoreWallet } from "./wallet-score.js";
import type { WalletIntelligenceReport } from "./types.js";

export async function buildWalletIntelligenceReport({
  wallets,
  lookbackDays,
  infoUrl
}: {
  wallets: string[];
  lookbackDays: number;
  infoUrl?: string;
}): Promise<WalletIntelligenceReport> {
  const endTime = Date.now();
  const startTime = endTime - lookbackDays * 24 * 60 * 60 * 1000;

  const scores = [];

  for (const wallet of wallets) {
    const request = infoUrl
      ? { wallet, startTime, endTime, infoUrl }
      : { wallet, startTime, endTime };

    const fills = await fetchUserFillsByTime(request);
    const trades = normalizeHyperliquidFills(wallet, fills);
    scores.push(scoreWallet(wallet, trades));
  }

  const allWallets = scores.sort((a, b) => b.consistencyScore - a.consistencyScore);

  return {
    type: "hyperliquid_wallet_intelligence_report",
    generatedAt: new Date().toISOString(),
    lookbackDays,
    walletsAnalyzed: wallets.length,
    topWallets: allWallets.slice(0, 20),
    allWallets
  };
}
