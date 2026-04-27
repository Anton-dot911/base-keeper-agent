export type MorphoMarketConfig = {
  marketId: string;
  label: string;
  loanAssetSymbol?: string;
  collateralAssetSymbol?: string;
  lltv?: number;
};

export type MorphoScanResult = {
  marketsChecked: number;
  positionsChecked: number;
  riskyPositionsCount: number;
  liquidationCandidatesCount: number;
  notes: string[];
};
