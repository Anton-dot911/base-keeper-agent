// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Placeholder only. Do not deploy.
/// @dev Execution is deliberately disabled in this starter.
contract LiquidationExecutorPlaceholder {
    error ExecutionDisabledInStarter();

    function liquidate() external pure {
        revert ExecutionDisabledInStarter();
    }
}
