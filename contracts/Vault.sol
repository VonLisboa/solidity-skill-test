// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Skill Test — Vault
/// @notice A simple ETH vault. Users deposit and withdraw their own funds;
///         the contract owner can perform a couple of administrative actions.
contract Vault {
    address public owner;
    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    /// @notice Deposit ETH into the caller's balance.
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    /// @notice Withdraw `amount` ETH from the caller's balance.
    function withdraw(uint256 amount) external {
        uint256 currentBalance = balances[msg.sender];
        require(amount <= currentBalance, "Insufficient balance"); // need verify current balance

        // the  balance need to be updated before contract transference
        // this prevents re-entrancy attacks where a lot of calls could be made at the same time
        unchecked {
            balances[msg.sender] = currentBalance - amount;
        }

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    /// @notice Transfer ownership of the vault to a new address.
    function setOwner(address newOwner) external {
        require(msg.sender == owner, "Not owner");
        owner = newOwner;
    }

    /// @notice Sweep the entire contract balance to the owner. Intended as a
    ///         break-glass recovery mechanism.
    function emergencyWithdraw() external {
        payable(owner).transfer(address(this).balance);
    }
}
