// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Skill Test — Vault
/// @notice A simple ETH vault. Users deposit and withdraw their own funds;
///         the contract owner can perform a couple of administrative actions.
contract Vault is Ownable2Step, ReentrancyGuard {
    bool public paused;
    uint256 public maxWithdrawal = type(uint256).max;
    mapping(address => uint256) public balances;

    // Events
    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);

    // Errors
    error ExceedsWithdrawalLimit(uint256 requested, uint256 limit);

    constructor() Ownable(msg.sender) {
        //the constructor of the Ownable inheriting from Ownable2Step sets the owner internally
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    /// @notice Deposit ETH into the caller's balance.
    function deposit() external payable whenNotPaused {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, balances[msg.sender]);
    }

    // @notice Set the per-transaction withdrawal limit. 0 = unlimited.
    function setMaxWithdrawal(uint256 newLimit) external {
        require(msg.sender == owner(), "Not owner");
        maxWithdrawal = newLimit;
    }

    /// @notice Withdraw `amount` ETH from the caller's balance.
    function withdraw(uint256 amount) external payable whenNotPaused nonReentrant {
        uint256 currentBalance = balances[msg.sender];
        require(amount <= currentBalance, "Insufficient balance"); // need verify current balance

        // less gas
        if (maxWithdrawal > 0 && amount > maxWithdrawal) {
            revert ExceedsWithdrawalLimit(amount, maxWithdrawal);
        }

        // the  balance need to be updated before contract transference
        // this prevents re-entrancy attacks where a lot of calls could be made at the same time
        unchecked {
            balances[msg.sender] = currentBalance - amount;
        }

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount, balances[msg.sender]);
    }


    /// @notice Sweep the entire contract balance to the owner. Intended as a
    ///         break-glass recovery mechanism.
    function emergencyWithdraw() external {
        require(msg.sender == owner(), "Not owner");
        payable(owner()).transfer(address(this).balance);
    }

    /// @notice Pause deposits and withdrawals. Only callable by the owner.
    function pause() external {
        require(msg.sender == owner(), "Not owner");
        paused = true;
    }

    /// @notice Unpause deposits and withdrawals. Only callable by the owner.
    function unpause() external {
        require(msg.sender == owner(), "Not owner");
        paused = false;
    }

}
