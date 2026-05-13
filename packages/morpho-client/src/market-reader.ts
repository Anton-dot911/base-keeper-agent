function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeLltv(value: unknown): number | null {
  const raw = toNumber(value);
  if (raw <= 0) return null;

  // Morpho LLTV → 18 decimals
  return raw > 1 ? raw / 1e18 : raw;
}

async function fetchWithRetry(url: string, options: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;

      // exponential backoff
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
}

export async function fetchMorphoMarketPositions(marketIds: string[]) {
  const query = `
    query ($keys: [String!]) {
      marketPositions(
        where: { marketUniqueKey_in: $keys }
        first: 100
      ) {
        items {
          borrowAssetsUsd
          collateralUsd
          market {
            uniqueKey
            lltv
          }
          user {
            address
          }
        }
      }
    }
  `;

  try {
    const json = await fetchWithRetry(
      "https://api.morpho.org/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query,
          variables: { keys: marketIds }
        })
      }
    );

    if (json.errors?.length) {
      console.error("Morpho GraphQL error:", json.errors);
      return [];
    }

    const items = json?.data?.marketPositions?.items ?? [];

    const parsed = items
      .map((p: any) => {
        const borrowAssetsUsd = toNumber(p.borrowAssetsUsd);
        const collateralUsd = toNumber(p.collateralUsd);
        const currentLtv =
          collateralUsd > 0 ? borrowAssetsUsd / collateralUsd : null;

        const lltv = normalizeLltv(p.market?.lltv);

        const healthFactor =
          currentLtv && lltv ? lltv / currentLtv : null;

        return {
          userAddress: p.user?.address ?? "unknown",
          marketId: p.market?.uniqueKey ?? "unknown",
          borrowAssetsUsd,
          collateralUsd,
          lltv,
          healthFactor
        };
      })
      .filter((p: any) => p.borrowAssetsUsd > 0 && p.collateralUsd > 0);

    return parsed;
  } catch (error) {
    console.error("Morpho API failure:", error);

    // 🔥 головне: НЕ падаємо
    return [];
  }
}
