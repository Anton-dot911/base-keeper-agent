import type { PreExecutionSimulation, TxSimulationResult } from "./types.js";

export function simulateTransactionCandidate(
  preExecution: PreExecutionSimulation
): TxSimulationResult {
  if (!preExecution.txCandidate) {
    return {
      type: "tx_simulation_result",
      mode: "skeleton",
      status: "skipped",
      attempted: false,
      simulated: false,
      passed: false,
      wouldRevert: null,
      gasEstimateUsd: 0,
      netAfterSimulationUsd: 0,
      reason: `No tx candidate available: ${preExecution.reason}`
    };
  }

  if (!preExecution.txCandidate.calldataReady) {
    return {
      type: "tx_simulation_result",
      mode: "skeleton",
      status: "calldata_not_ready",
      attempted: false,
      simulated: false,
      passed: false,
      wouldRevert: null,
      gasEstimateUsd: preExecution.estimatedBundleGasUsd,
      netAfterSimulationUsd: preExecution.estimatedNetAfterBundleUsd,
      reason:
        "Tx candidate exists, but real Morpho liquidation calldata builder is not implemented yet. No onchain simulation was attempted."
    };
  }

  return {
    type: "tx_simulation_result",
    mode: "skeleton",
    status: "ready_not_simulated",
    attempted: false,
    simulated: false,
    passed: false,
    wouldRevert: null,
    gasEstimateUsd: preExecution.estimatedBundleGasUsd,
    netAfterSimulationUsd: preExecution.estimatedNetAfterBundleUsd,
    reason:
      "Calldata is marked ready, but real viem/anvil transaction simulation is not connected yet."
  };
}
