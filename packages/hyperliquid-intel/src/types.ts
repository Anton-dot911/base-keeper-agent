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
};

export type WalletIntelligenceReport = {
  type: "hyperliquid_wallet_intelligence_report";
  generatedAt: string;
  lookbackDays: number;
  chunkHours: number;
  walletsAnalyzed: number;
  topWallets: WalletScore[];
  allWallets: WalletScore[];
};
