export type ConfiguredMarket = {
  id: string;
};

export function loadConfiguredMarkets(marketIds: string[]): ConfiguredMarket[] {
  return marketIds.map((id) => ({ id }));
}
