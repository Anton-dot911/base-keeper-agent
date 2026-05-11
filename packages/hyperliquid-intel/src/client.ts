const DEFAULT_HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

export class HyperliquidInfoClient {
  constructor(private readonly infoUrl = DEFAULT_HYPERLIQUID_INFO_URL) {}

  async post<T>(body: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.infoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Hyperliquid info request failed: ${response.status} ${response.statusText} ${text}`
      );
    }

    return (await response.json()) as T;
  }
}

export function createHyperliquidInfoClient(infoUrl?: string): HyperliquidInfoClient {
  return new HyperliquidInfoClient(infoUrl);
}
