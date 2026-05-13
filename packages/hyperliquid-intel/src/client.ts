const DEFAULT_HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_BASE_DELAY_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number): number {
  return DEFAULT_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
}

export class HyperliquidInfoClient {
  constructor(private readonly infoUrl = DEFAULT_HYPERLIQUID_INFO_URL) {}

  async post<T>(body: Record<string, unknown>): Promise<T> {
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt += 1) {
      const response = await fetch(this.infoUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const text = await response.text();
      lastError = `Hyperliquid info request failed: ${response.status} ${response.statusText} ${text}`;

      if (response.status !== 429 || attempt === DEFAULT_MAX_RETRIES) {
        throw new Error(lastError);
      }

      const delayMs = retryDelayMs(attempt);
      console.warn(
        JSON.stringify({
          type: "hyperliquid_rate_limited",
          attempt: attempt + 1,
          retryInMs: delayMs
        })
      );
      await sleep(delayMs);
    }

    throw new Error(lastError ?? "Hyperliquid info request failed.");
  }
}

export function createHyperliquidInfoClient(infoUrl?: string): HyperliquidInfoClient {
  return new HyperliquidInfoClient(infoUrl);
}
