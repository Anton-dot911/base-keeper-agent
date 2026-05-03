function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeLltv(value: unknown): number | null {
  const raw = toNumber(value);
  if (raw <= 0) return null;

  // Morpho LLTV is often returned as 18-decimal fixed point.
  // Example: 860000000000000000 = 86%.
  if (raw > 1) return raw / 1e18;

  return raw;
}

export async function fetchMorphoMarketPositions(marketIds: string[]) {
  const query = `
    query ($keys: [String!]) {
      marketPositions(
        where: { marketUniqueKey_in: $keys }
        first: 100
        orderBy: BorrowAssetsUsd
        orderDirection: Desc
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

  const res = await fetch("https://api.morpho.org/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables: { keys: marketIds } })
  });

  if (!res.ok) {
    throw new Error(`Morpho API request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(`Morpho API GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const items = json?.data?.marketPositions?.items ?? [];

  return items
    .map((p: any) => {
      const borrowAssetsUsd = toNumber(p.borrowAssetsUsd);
      const collateralUsd = toNumber(p.collateralUsd);
      const currentLtv = collateralUsd > 0 ? borrowAssetsUsd / collateralUsd : null;
      const lltv = normalizeLltv(p.market?.lltv);

      const healthFactor =
        currentLtv !== null && currentLtv > 0 && lltv !== null
          ? lltv / currentLtv
          : null;

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
}
