const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vault", function () {
  async function deployVault() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();
    return { vault, owner, alice, bob };
  }

  it("lets a user deposit and see their balance go up", async function () {
    const { vault, alice } = await deployVault();

    await vault.connect(alice).deposit({ value: ethers.parseEther("1") });

    expect(await vault.balances(alice.address)).to.equal(ethers.parseEther("1"));
  });

  // TODO (candidate): add tests covering:
  // - withdraw actually decreases balances[user] and pays out the correct amount
  // - a malicious contract cannot re-enter withdraw() to drain more than its balance
  // - withdraw cannot be called for more than the caller's balance (no silent underflow)
  // - ownership can only be changed by the actual owner (not via tx.origin phishing)
  // - emergencyWithdraw can only be called by the owner
  // - any Part 2 features you implement (events, withdrawal limit, pause, ownership transfer flow, etc.)

  // 1. Reentrância: MaliciousVault não consegue drenar além do saldo
  it("blocks reentrancy — attacker cannot drain more than deposited", async function () {
    const MaliciousVault = await ethers.getContractFactory("MaliciousVault");
    const { 
      vault, 
      alice, 
      bob: attacker 
    } = await deployVault();
    const malicious = await MaliciousVault.deploy(vault.getAddress());

    // fundo de alice added no vault para que a reentrância tenha algo a drenar
    await vault.connect(alice).deposit({ value: ethers.parseEther("10") });

    // atacante bob utiliza um contrato malicioso para atacar o vault e retirar todo o saldo
    await malicious.connect(attacker).attack({ value: ethers.parseEther("1") });

    const vaultBalance = await ethers.provider.getBalance(vault.getAddress());
    // se vulnerável, vaultBalance < 10 ETH (drain ocorreu)
    // se protegido, vaultBalance == 10 ETH (apenas o depósito do atacante foi sacado)
    expect(vaultBalance).to.equal(ethers.parseEther("10"));
  });

  // 2. Saque maior que o saldo falha com revert
  it("reverts when withdrawing more than balance", async function () {
    const { vault, alice } = await deployVault();
    await vault.connect(alice).deposit(
      { value: ethers.parseEther("1") }
    );
    
    await expect(
      vault.connect(alice).withdraw(ethers.parseEther("2"))
    ).to.be.revertedWith("Insufficient balance");
  });
});