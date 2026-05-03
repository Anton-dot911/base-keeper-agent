export async function fetchMorphoMarketPositions(marketIds: string[]) {
  const query = `
    query ($keys: [String!]) {
      marketPositions(where: { marketUniqueKey_in: $keys }, first: 50) {
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

  const json = await res.json();

  if (!json?.data?.marketPositions?.items) {
    return [];
  }

  return json.data.marketPositions.items.map((p: any) => {
    const borrow = Number(p.borrowAssetsUsd || 0);
    const collateral = Number(p.collateralUsd || 0);

    const ltv = collateral > 0 ? borrow / collateral : null;
    const lltv = p.market.lltv ? Number(p.market.lltv) : null;

    const healthFactor = ltv && lltv ? lltv / ltv : null;

    return {
      userAddress: p.user.address,
      marketId: p.market.uniqueKey,
      borrowAssetsUsd: borrow,
      collateralUsd: collateral,
      lltv,
      healthFactor
    };
  });
}
