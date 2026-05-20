import { readFile } from "node:fs/promises";

const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export type ImportedWatchlistWallet = {
  address: string;
  tier?: string;
  score?: number;
  rank?: number;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type ImportedWatchlist = {
  type?: string;
  version?: string;
  source?: string;
  platform?: string;
  generatedAt?: string;
  walletCount?: number;
  wallets: ImportedWatchlistWallet[];
};

function normalizeWalletAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return WALLET_ADDRESS_PATTERN.test(trimmed) ? trimmed : null;
}

function parseWalletRecord(record: unknown, fallbackSource?: string): ImportedWatchlistWallet | null {
  if (typeof record === "string") {
    const address = normalizeWalletAddress(record);
    return address ? { address, source: fallbackSource } : null;
  }

  if (!record || typeof record !== "object") return null;

  const sourceRecord = record as Record<string, unknown>;
  const address = normalizeWalletAddress(
    sourceRecord.address ?? sourceRecord.wallet ?? sourceRecord.wallet_address
  );

  if (!address) return null;

  const score = Number(sourceRecord.score ?? sourceRecord.candidate_score);
  const rank = Number(sourceRecord.rank);

  return {
    address,
    tier: typeof sourceRecord.tier === "string" ? sourceRecord.tier : undefined,
    score: Number.isFinite(score) ? score : undefined,
    rank: Number.isFinite(rank) ? rank : undefined,
    source: typeof sourceRecord.source === "string" ? sourceRecord.source : fallbackSource,
    metadata: Object.fromEntries(
      Object.entries(sourceRecord).filter(
        ([key]) => !["address", "wallet", "wallet_address", "tier", "score", "candidate_score", "rank", "source"].includes(key)
      )
    )
  };
}

function dedupeWallets(wallets: ImportedWatchlistWallet[]): ImportedWatchlistWallet[] {
  const byAddress = new Map<string, ImportedWatchlistWallet>();

  for (const wallet of wallets) {
    const existing = byAddress.get(wallet.address);
    if (!existing) {
      byAddress.set(wallet.address, wallet);
      continue;
    }

    const existingScore = existing.score ?? -Infinity;
    const incomingScore = wallet.score ?? -Infinity;
    if (incomingScore > existingScore) {
      byAddress.set(wallet.address, wallet);
    }
  }

  return [...byAddress.values()];
}

function sortWallets(wallets: ImportedWatchlistWallet[]): ImportedWatchlistWallet[] {
  return [...wallets].sort((a, b) => {
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;

    const scoreA = a.score ?? -Infinity;
    const scoreB = b.score ?? -Infinity;
    if (scoreA !== scoreB) return scoreB - scoreA;

    return a.address.localeCompare(b.address);
  });
}

function parseJsonWatchlist(content: string): ImportedWatchlist {
  const parsed = JSON.parse(content) as unknown;

  if (Array.isArray(parsed)) {
    const wallets = parsed
      .map((record) => parseWalletRecord(record, "json_array"))
      .filter((wallet): wallet is ImportedWatchlistWallet => wallet !== null);
    return { type: "imported_watchlist", source: "json_array", wallets };
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Watchlist JSON must be an object or an array.");
  }

  const source = parsed as Record<string, unknown>;
  const rawWallets = Array.isArray(source.wallets)
    ? source.wallets
    : Array.isArray(source.lifecycleWallets)
      ? source.lifecycleWallets
      : [];

  const wallets = rawWallets
    .map((record) => parseWalletRecord(record, typeof source.source === "string" ? source.source : "json"))
    .filter((wallet): wallet is ImportedWatchlistWallet => wallet !== null);

  return {
    type: typeof source.type === "string" ? source.type : "imported_watchlist",
    version: typeof source.version === "string" ? source.version : undefined,
    source: typeof source.source === "string" ? source.source : "json",
    platform: typeof source.platform === "string" ? source.platform : undefined,
    generatedAt: typeof source.generatedAt === "string" ? source.generatedAt : undefined,
    walletCount: wallets.length,
    wallets
  };
}

function parseTextWatchlist(content: string): ImportedWatchlist {
  const wallets = content
    .split(/[\n,\s]+/)
    .map((item) => normalizeWalletAddress(item))
    .filter((address): address is string => address !== null)
    .map((address, index) => ({ address, rank: index + 1, source: "text" }));

  return {
    type: "imported_watchlist",
    source: "text",
    walletCount: wallets.length,
    wallets
  };
}

export async function importWatchlistFromFile({
  path,
  limitWallets
}: {
  path: string;
  limitWallets?: number;
}): Promise<ImportedWatchlist> {
  const content = await readFile(path, "utf8");
  const parsed = path.endsWith(".json") ? parseJsonWatchlist(content) : parseTextWatchlist(content);
  const wallets = sortWallets(dedupeWallets(parsed.wallets)).slice(0, limitWallets ?? undefined);

  return {
    ...parsed,
    walletCount: wallets.length,
    wallets
  };
}

export function watchlistToWalletInput(watchlist: ImportedWatchlist): string {
  return watchlist.wallets.map((wallet) => wallet.address).join(",");
}
