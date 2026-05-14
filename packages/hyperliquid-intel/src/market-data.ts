import { createHyperliquidInfoClient } from "./client.js";

export type HyperliquidMids = Record<string, string>;

export async function fetchAllMids({
  infoUrl
}: {
  infoUrl?: string;
} = {}): Promise<Record<string, number>> {
  const client = createHyperliquidInfoClient(infoUrl);
  const mids = await client.post<HyperliquidMids>({ type: "allMids" });

  return Object.fromEntries(
    Object.entries(mids)
      .map(([coin, value]) => [coin, Number(value)] as const)
      .filter(([, value]) => Number.isFinite(value) && value > 0)
  );
}
