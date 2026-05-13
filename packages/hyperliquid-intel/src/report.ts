import { fetchUserFillsByTimeChunked } from "./fills-reader.js";
import { normalizeHyperliquidFills } from "./trade-normalizer.js";
import { scoreWallet } from "./wallet-score.js";
import type { WalletIntelligenceReport } from "./types.js";

const DEFAULT_CHUNK_HOURS = 24;
const DEFAULT_WALLET_DELAY_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function buildWalletIntelligenceReport({
  wallets,
  lookbackDays,
  chunkHours = DEFAULT_CHUNK_HOURS,
  walletDelayMs = DEFAULT_WALLET_DELAY_MS,
  infoUrl
}: {
  wallets: string[];
  lookbackDays: number;
  chunkHours?: number;
  walletDelayMs?: number;
  infoUrl?: string;
}): Promise<WalletIntelligenceReport> {
  const endTime = Date.now();
  const startTime = endTime - lookbackDays * 24 * 60 * 60 * 1000;

  const scores = [];

  for (const [index, wallet] of wallets.entries()) {
    console.log(
      JSON.stringify({
        type: "hyperliquid_wallet_analysis_started",
        wallet,
        index: index + 1,
        total: wallets.length
      })
    );

    const request = infoUrl
      ? { wallet, startTime, endTime, chunkHours, infoUrl }
      : { wallet, startTime, endTime, chunkHours };

    const fills = await fetchUserFillsByTimeChunked(request);
    const trades = normalizeHyperliquidFills(wallet, fills);
    scores.push(scoreWallet(wallet, trades));

    if (index < wallets.length - 1) {
      await sleep(walletDelayMs);
    }
  }

  const allWallets = scores.sort((a, b) => b.consistencyScore - a.consistencyScore);
  const candidateWallets = allWallets.filter((wallet) => wallet.recommendation === "candidate");
  const watchWallets = allWallets.filter((wallet) => wallet.recommendation === "watch");

  return {
    type: "hyperliquid_wallet_intelligence_report",
    generatedAt: new Date().toISOString(),
    lookbackDays,
    chunkHours,
    walletsAnalyzed: wallets.length,
    candidateWallets,
    watchWallets,
    topWallets: allWallets.slice(0, 20),
    allWallets
  };
}
