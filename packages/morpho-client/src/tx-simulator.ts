import type { LiquidationSimulation, PreExecutionSimulation } from "./types.js";

export function simulatePreExecutionReadiness({
  marketId,
  userAddress,
  healthFactor,
  liquidationSimulation
}: {
  marketId: string;
  userAddress: string | null;
  healthFactor: number | null;
  liquidationSimulation: LiquidationSimulation;
}): PreExecutionSimulation {
  if (healthFactor === null) {
    return blocked("health_factor_unavailable", "Health factor is unavailable. Fresh risk data is required before tx simulation.");
  }

  if (healthFactor > 1) {
    return blocked("not_liquidatable", "Health factor is above 1.0, so the position is not currently liquidatable.");
  }

  if (!liquidationSimulation.eligible) {
    return blocked("simulation_not_eligible", liquidationSimulation.reason);
  }

  if (!liquidationSimulation.profitable) {
    return blocked("not_profitable", liquidationSimulation.reason);
  }

  if (liquidationSimulation.confidence !== "high") {
    return blocked("low_confidence", `Simulation confidence is ${liquidationSimulation.confidence}, not high.`);
  }

  return {
    type: "pre_execution_simulation",
    status: "ready_for_tx_simulation",
    txCandidate: {
      type: "liquidation_tx_candidate",
      marketId,
      borrower: userAddress,
      targetContract: "MORPHO_BLUE_CONTRACT_PENDING",
      functionName: "liquidate",
      calldataReady: false,
      reason: "Signal passed basic filters. Next step: build real Morpho liquidation calldata and simulate onchain."
    },
    estimatedBundleGasUsd: liquidationSimulation.estimatedGasCostUsd,
    estimatedNetAfterBundleUsd: liquidationSimulation.netProfitUsd,
    reason: "Signal is ready for onchain transaction simulation. No transaction will be sent in shadow mode."
  };
}

function blocked(code: PreExecutionSimulation["status"], reason: string): PreExecutionSimulation {
  return {
    type: "pre_execution_simulation",
    status: code,
    txCandidate: null,
    estimatedBundleGasUsd: 0,
    estimatedNetAfterBundleUsd: 0,
    reason
  };
}
