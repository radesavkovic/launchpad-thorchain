const { expect } = require("chai");
const { upgrades } = require("hardhat");
const {
  ADDRESS_ZERO,
  ADDRESS_DEAD,
  bn,
  deployRegistry,
  expectError,
  advanceTime,
} = require("./utilities");

describe("Tiers", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];

    this.MockToken = await ethers.getContractFactory("MockToken");
    this.token = await this.MockToken.deploy();
    await this.token.deployed();
    this.token2 = await this.MockToken.deploy();
    await this.token2.deployed();
    await this.token.transfer(this.signers[1].address, bn(100));

    this.Voters = await ethers.getContractFactory("Voters");
    this.voters = await this.Voters.deploy(
      this.signer.address,
      this.token.address,
      this.token.address
    );
    await this.voters.deployed();

    this.Tiers = await ethers.getContractFactory("TiersV1");
    this.tiers = await upgrades.deployProxy(this.Tiers, [
      this.signer.address,
      ADDRESS_DEAD,
      this.token.address,
      this.voters.address
    ]);
    await this.voters.deployed();
    await this.tiers.updateToken([this.token.address, this.token2.address], [bn(2, 8), bn(1, 7)]);
  });

  it("deposit", async function() {
    await this.token.approve(this.tiers.address, bn(10));
    const balanceBefore = await this.token.balanceOf(this.signer.address);
    await expect(
      this.tiers.deposit(this.token.address, bn(10))
    )
      .to.emit(this.tiers, "Deposit")
      .withArgs(this.signer.address, bn(10));
    const balanceAfter = await this.token.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(-10));
    expect((await this.tiers.userInfoTotal(this.signer.address))[0]).to.equal(
      bn(20)
    );
    expect(await this.tiers.totalAmount()).to.equal(bn(20));

    await expectError("not a supported token", () =>
      this.tiers.deposit(ADDRESS_ZERO, bn(1))
    );

    await this.tiers.togglePausedDeposit();
    await expectError("paused", () =>
      this.tiers.deposit(this.token.address, bn(1))
    );
  });

  it("withdraw", async function() {
    await this.token.approve(this.tiers.address, bn(10));
    await this.tiers.deposit(this.token.address, bn(10));

    await expectError("withdraw before 7 days", () =>
      this.tiers.withdraw(this.token.address, bn(8), this.signer.address)
    );
    await advanceTime(8 * 24 * 60 * 60);

    const balanceBefore = await this.token.balanceOf(this.signer.address);
    await expect(
      this.tiers.withdraw(this.token.address, bn(8), this.signer.address)
    )
      .to.emit(this.tiers, "Withdraw")
      .withArgs(this.signer.address, bn(8), this.signer.address);
    const balanceAfter = await this.token.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(8));
    expect((await this.tiers.userInfoTotal(this.signer.address))[0]).to.equal(
      bn(4)
    );

    await this.tiers.togglePausedWithdraw();
    await expectError("paused", () =>
      this.tiers.withdraw(this.token.address, bn(1), this.signer.address)
    );
  });

  it("withdrawNow", async function() {
    await this.token.approve(this.tiers.address, bn(10));
    await this.tiers.deposit(this.token.address, bn(10));
    expect(await this.tiers.lastFeeGrowth()).to.equal('1');
    const balanceBefore = await this.token.balanceOf(this.signer.address);
    await expect(
      this.tiers.withdrawNow(this.token.address, bn(8), this.signer.address)
    )
      .to.emit(this.tiers, "WithdrawNow")
      .withArgs(this.signer.address, bn(8), this.signer.address);
    const balanceAfter = await this.token.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(4));
    expect(await this.tiers.lastFeeGrowth()).to.equal('100000001');
    expect((await this.tiers.userInfoTotal(this.signer.address))[0]).to.equal(
      bn(4)
    );

    // Use token2 to test donations to dao
    await this.token2.approve(this.tiers.address, bn(1));
    await this.tiers.deposit(this.token2.address, bn(1));
    await this.tiers.withdrawNow(this.token2.address, bn(1), this.signer.address);
    expect(await this.tiers.lastFeeGrowth()).to.equal('100000001');
    expect(await this.token2.balanceOf(ADDRESS_DEAD)).to.equal(bn('0.5'));
  });

  it("donate", async function() {
    await this.token.approve(this.tiers.address, bn(16));
    await this.tiers.deposit(this.token.address, bn(15));
    await this.token.connect(this.signers[1]).approve(this.tiers.address, bn(5));
    await this.tiers.connect(this.signers[1]).deposit(this.token.address, bn(5));
    await this.token.approve(this.voters.address, bn(10));
    await this.voters.lock(bn(10));
    await expect(this.tiers.donate(bn(1)))
      .to.emit(this.tiers, "Donate")
      .withArgs(this.signer.address, bn(1));
    expect(
      (await this.tiers.userInfoAmounts(this.signer.address))[4][0]
    ).to.equal(bn(15.75));
    await advanceTime(8 * 24 * 60 * 60);
    await this.tiers.withdraw(
      this.token.address,
      bn(15.75),
      this.signer.address
    );
    expect((await this.tiers.userInfoTotal(this.signer.address))[0]).to.equal(
      bn(0)
    );
  });

  it("updateNft", async function() {
    await this.tiers.updateNft(this.token.address, bn(3000));
    await this.token.approve(this.tiers.address, bn(10));
    await this.tiers.deposit(this.token.address, bn(10));

    await this.tiers.updateVotersTokenRate(bn(1, 8));
    await this.token.approve(this.voters.address, bn(100));
    await this.voters.lock(bn(100));

    expect((await this.tiers.userInfoTotal(this.signer.address))[1]).to.equal(
      bn(3120)
    );
  });

  it("userInfoAmounts", async function() {
    await this.tiers.updateNft(this.token.address, bn(3000));
    await this.token.approve(this.tiers.address, bn(10));
    await this.tiers.deposit(this.token.address, bn(10));

    await this.tiers.updateVotersTokenRate(bn(1, 8));
    await this.token.approve(this.voters.address, bn(100));
    await this.voters.lock(bn(100));

    expect(
      await this.tiers.userInfoAmounts(this.signer.address)
    ).to.deep.equal([
      bn(20),
      bn(3120),
      [this.token.address, this.token2.address, this.voters.address, this.token.address],
      [bn(2, 8), bn(1, 7), bn(1, 8), bn(3000)],
      [bn(10), bn(0), bn(100), await this.token.balanceOf(this.signer.address)],
    ]);
  });
});
