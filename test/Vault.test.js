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

  // 1. reentrancy: MaliciousVault can't drain more than total balance 
  it("blocks reentrancy — attacker cannot drain more than deposited", async function () {
    const MaliciousVault = await ethers.getContractFactory("MaliciousVault");
    const { 
      vault, 
      alice, 
      bob: attacker 
    } = await deployVault();
    const malicious = await MaliciousVault.deploy(vault.getAddress());

    // alice amount added to vault so the test can check that reentrancy has something to drain
    await vault.connect(alice).deposit({ value: ethers.parseEther("10") });

    // attacker uses a malicious contract to drain the vault
    await malicious.connect(attacker).attack({ value: ethers.parseEther("1") });

    const vaultBalance = await ethers.provider.getBalance(vault.getAddress());
    // if vulnerable, vaultBalance < 10 ETH (drained)
    // if protected, vaultBalance == 10 ETH (just the balance of the attacker was drained)
    expect(vaultBalance).to.equal(ethers.parseEther("10"));
  });

  // 2. Cannot withdraw more than balance, fails with revert
  it("reverts when withdrawing more than balance", async function () {
    const { vault, alice } = await deployVault();
    await vault.connect(alice).deposit(
      { value: ethers.parseEther("1") }
    );
    
    await expect(
      vault.connect(alice).withdraw(ethers.parseEther("2"))
    ).to.be.revertedWith("Insufficient balance");
  });

   // 3. Ownership: apenas o owner real pode alterar (não via tx.origin)
  it("only real owner can change ownership", async function () {
    const { vault, owner, alice } = await deployVault();
    
    // alice (não-owner) tenta
    await expect(
      vault.connect(alice).setOwner(alice.address)
    ).to.be.revertedWith("Not owner");
    
    // owner real consegue
    await vault.connect(owner).setOwner(alice.address);

    expect(await vault.owner()).to.equal(alice.address);
  });

  // 4. emergencyWithdraw: apenas owner
  it("only owner can emergencyWithdraw", async function () {
    const { vault, owner, alice } = await deployVault();
    
    await vault.connect(alice).deposit({ value: ethers.parseEther("1") });
    
    // alice não pode
    await expect(
      vault.connect(alice).emergencyWithdraw()
    ).to.be.revertedWith("Not owner");
    
    // owner pode
    await vault.connect(owner).emergencyWithdraw();
    
    // vault deve estar vazio após emergencyWithdraw
    expect(await vault.balances(owner.address)).to.equal(0);
  });

  it("enforces maxWithdrawal limit", async function () {
    const { vault, owner, alice } = await deployVault();
    await vault.connect(alice).deposit({ value: ethers.parseEther("10") });

    // default: unlimited (type(uint256).max)
    await expect(
      vault.connect(alice).withdraw(ethers.parseEther("5"))
    ).to.not.be.reverted;

    // set limit to 2 ETH
    await vault.connect(owner).setMaxWithdrawal(ethers.parseEther("2"));

    // within limit: ok
    await expect(
      vault.connect(alice).withdraw(ethers.parseEther("2"))
    ).to.not.be.reverted;

    // exceeds limit: reverts with custom error
    await expect(
      vault.connect(alice).withdraw(ethers.parseEther("3"))
    ).to.be.revertedWithCustomError(vault, "ExceedsWithdrawalLimit");
  });

  it("only owner can set maxWithdrawal", async function () {
    const { vault, owner, alice } = await deployVault();

    await expect(
      vault.connect(alice).setMaxWithdrawal(ethers.parseEther("1"))
    ).to.be.revertedWith("Not owner");

    await expect(vault.connect(owner).setMaxWithdrawal(ethers.parseEther("1"))).to.not.be.reverted;
    expect(await vault.maxWithdrawal()).to.equal(ethers.parseEther("1"));
  });
});


