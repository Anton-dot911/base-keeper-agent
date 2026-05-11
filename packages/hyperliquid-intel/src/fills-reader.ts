import { createHyperliquidInfoClient } from "./client.js";
import type { HyperliquidFill } from "./types.js";

export async function fetchUserFillsByTime({
  wallet,
  startTime,
  endTime,
  infoUrl
}: {
  wallet: string;
  startTime: number;
  endTime?: number;
  infoUrl?: string;
}): Promise<HyperliquidFill[]> {
  const client = createHyperliquidInfoClient(infoUrl);

  return client.post<HyperliquidFill[]>({
    type: "userFillsByTime",
    user: wallet,
    startTime,
    ...(endTime ? { endTime } : {})
  });
}

export async function fetchRecentUserFills({
  wallet,
  infoUrl
}: {
  wallet: string;
  infoUrl?: string;
}): Promise<HyperliquidFill[]> {
  const client = createHyperliquidInfoClient(infoUrl);

  return client.post<HyperliquidFill[]>({
    type: "userFills",
    user: wallet
  });
}
