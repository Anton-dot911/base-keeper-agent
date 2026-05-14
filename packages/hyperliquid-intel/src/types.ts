export type HyperliquidSide = "buy" | "sell";

export type HyperliquidFill = {
  coin: string;
  side: "B" | "A" | string;
  px: string;
  sz: string;
  time: number;
  startPosition?: string;
  dir?: string;
  closedPnl?: string;
  hash?: string;
  oid?: number;
  crossed?: boolean;
  fee?: string;
  feeToken?: string;
};

export type NormalizedHyperliquidTrade = {
  platform: "hyperliquid";
  wallet: string;
  coin: string;
  side: HyperliquidSide;
  price: number;
  size: number;
  notionalUsd: number;
  closedPnlUsd: number;
  rawFeeUsd: number;
  feeCostUsd: number;
  netPnlUsd: number;
  timestamp: string;
  rawTime: number;
  hash: string | null;
  oid: number | null;
  direction: string | null;
};

export type CoinPerformance = {
  coin: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalNetPnlUsd: number;
  totalClosedPnlUsd: number;
  totalFeesUsd: number;
  totalNotionalUsd: number;
  averagePnlUsd: number;
  medianPnlUsd: number;
  largestWinUsd: number;
  largestLossUsd: number;
  profitFactor: number | null;
};

export type WalletScore = {
  wallet: string;
  tradesAnalyzed: number;
  activeDays: number;
  lastActiveAt: string | null;
  totalClosedPnlUsd: number;
  totalFeesUsd: number;
  totalNetPnlUsd: number;
  wins: number;
  losses: number;
  winRate: number;
  averagePnlUsd: number;
  medianPnlUsd: number;
  largestWinUsd: number;
  largestLossUsd: number;
  grossProfitUsd: number;
  grossLossUsd: number;
  profitFactor: number | null;
  consistencyScore: number;
  copyRisk: "low" | "medium" | "high";
  recommendation: "watch" | "candidate" | "skip";
  reasons: string[];
  topCoinsByNetPnl: CoinPerformance[];
  worstCoinsByNetPnl: CoinPerformance[];
};

export type WalletIntelligenceReport = {
  type: "hyperliquid_wallet_intelligence_report";
  generatedAt: string;
  lookbackDays: number;
  chunkHours: number;
  walletsAnalyzed: number;
  candidateWallets: WalletScore[];
  watchWallets: WalletScore[];
  topWallets: WalletScore[];
  allWallets: WalletScore[];
};

export type HyperliquidWatchlistSignal = {
  type: "hyperliquid_watchlist_signal";
  wallet: string;
  coin: string;
  side: HyperliquidSide;
  price: number;
  size: number;
  notionalUsd: number;
  direction: string | null;
  hash: string | null;
  oid: number | null;
  fillTime: string;
  detectedAt: string;
  decision: "paper_watch" | "skip";
  reason: string;
};

export type HyperliquidTradeEvent = {
  type: "hyperliquid_trade_event";
  wallet: string;
  coin: string;
  direction: string;
  side: HyperliquidSide;
  eventKind: "entry" | "exit" | "unknown";
  decision: "paper_entry" | "paper_exit" | "skip";
  reason: string;
  fills: number;
  totalSize: number;
  totalNotionalUsd: number;
  averagePrice: number;
  firstFillTime: string;
  lastFillTime: string;
  oids: number[];
  hashes: string[];
};

export type HyperliquidWatchlistReport = {
  type: "hyperliquid_watchlist_report";
  generatedAt: string;
  lookbackMinutes: number;
  walletsWatched: number;
  fillsDetected: number;
  eventsDetected: number;
  paperEntryEvents: number;
  paperExitEvents: number;
  signals: HyperliquidWatchlistSignal[];
  events: HyperliquidTradeEvent[];
};
