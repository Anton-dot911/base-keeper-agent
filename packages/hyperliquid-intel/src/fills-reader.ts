import { createHyperliquidInfoClient } from "./client.js";
import type { HyperliquidFill } from "./types.js";

const DEFAULT_CHUNK_HOURS = 24;
const CHUNK_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fillKey(fill: HyperliquidFill): string {
  return [fill.hash ?? "no-hash", fill.oid ?? "no-oid", fill.time, fill.coin, fill.side, fill.px, fill.sz].join(":");
}

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

export async function fetchUserFillsByTimeChunked({
  wallet,
  startTime,
  endTime,
  chunkHours = DEFAULT_CHUNK_HOURS,
  infoUrl
}: {
  wallet: string;
  startTime: number;
  endTime: number;
  chunkHours?: number;
  infoUrl?: string;
}): Promise<HyperliquidFill[]> {
  const chunkMs = chunkHours * 60 * 60 * 1000;
  const byKey = new Map<string, HyperliquidFill>();

  for (let chunkStart = startTime; chunkStart < endTime; chunkStart += chunkMs) {
    const chunkEnd = Math.min(chunkStart + chunkMs - 1, endTime);
    const request = infoUrl
      ? { wallet, startTime: chunkStart, endTime: chunkEnd, infoUrl }
      : { wallet, startTime: chunkStart, endTime: chunkEnd };

    const fills = await fetchUserFillsByTime(request);

    for (const fill of fills) {
      byKey.set(fillKey(fill), fill);
    }

    if (chunkStart + chunkMs < endTime) {
      await sleep(CHUNK_DELAY_MS);
    }
  }

  return [...byKey.values()].sort((a, b) => a.time - b.time);
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
