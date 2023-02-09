const { expect, assert } = require("chai");
const {
  expectError,
  advanceBlockTo,
  advanceBlock,
  prepare,
  deploy,
  bn,
  ADDRESS_ZERO
} = require("./utilities");

describe("StakingSingle", function() {
  before(async function() {
    await prepare(this, ["ERC20Mock", "StakingSingle"]);
  });

  beforeEach(async function() {
    await deploy(this, [["token", this.ERC20Mock, ["Token", "TKN", bn(1000)]]]);
    await deploy(this, [
      [
        "staking",
        this.StakingSingle,
        [this.token.address, bn(1), this.alice.address]
      ]
    ]);
  });

  it("pendingRewards", async function() {
    await this.token.approve(this.staking.address, bn(10));
    const log = await this.staking.deposit(bn(1), this.alice.address);
    await advanceBlock();
    const log2 = await this.staking.update();
    await advanceBlock();
    const expected = bn(1).mul(log2.blockNumber - log.blockNumber);
    const pending = await this.staking.pendingRewards(this.alice.address);
    expect(pending).to.be.equal(expected);
  });

  it("update", async function() {
    await advanceBlockTo(1);
    await expect(this.staking.update())
      .to.emit(this.staking, "Update")
      .withArgs(
        await this.staking.lastRewardBlock(),
        await this.staking.totalAmount(),
        await this.staking.accRewardPerShare()
      );
  });

  it("deposit", async function() {
    await this.token.approve(this.staking.address, bn(10));
    const balanceBefore = await this.token.balanceOf(this.alice.address);
    await expect(this.staking.deposit(bn(10), this.alice.address))
      .to.emit(this.staking, "Deposit")
      .withArgs(this.alice.address, bn(10), this.alice.address);
    const balanceAfter = await this.token.balanceOf(this.alice.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(-10));
    expect((await this.staking.userInfo(this.alice.address))[0]).to.equal(
      bn(10)
    );
  });

  it("deposit error", async function() {
    await expectError("not depositor", () =>
      this.staking.connect(this.dev).deposit(bn(1), this.dev.address)
    );
  });

  it("withdraw", async function() {
    await this.token.approve(this.staking.address, bn(10));
    await this.staking.deposit(bn(10), this.alice.address);
    const balanceBefore = await this.token.balanceOf(this.alice.address);
    await expect(this.staking.withdraw(bn(5), this.alice.address))
      .to.emit(this.staking, "Withdraw")
      .withArgs(this.alice.address, bn(5), this.alice.address);
    const balanceAfter = await this.token.balanceOf(this.alice.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(5));
    expect((await this.staking.userInfo(this.alice.address))[0]).to.equal(
      bn(5)
    );
  });

  it("harvest", async function() {
    await this.token.transfer(this.staking.address, bn(100));
    await this.token.approve(this.staking.address, bn(10));
    const log = await this.staking.deposit(bn(1), this.alice.address);
    await advanceBlockTo(20);
    const log2 = await this.staking.withdraw(bn(1), this.alice.address);
    const expected = bn(1).mul(log2.blockNumber - log.blockNumber);
    expect(
      (await this.staking.userInfo(this.alice.address)).rewardDebt
    ).to.be.equal("-" + expected);
    const balanceBefore = await this.token.balanceOf(this.alice.address);
    await this.staking.harvest(this.alice.address);
    const balanceAfter = await this.token.balanceOf(this.alice.address);
    expect(balanceAfter.sub(balanceBefore)).to.be.equal(expected);
  });

  it("emergencyWithdraw", async function() {
    await this.token.approve(this.staking.address, bn(10));
    await this.staking.deposit(bn(1), this.bob.address);
    await expect(
      this.staking.connect(this.bob).emergencyWithdraw(this.bob.address)
    )
      .to.emit(this.staking, "EmergencyWithdraw")
      .withArgs(this.bob.address, bn(1), this.bob.address);
    expect(await this.token.balanceOf(this.bob.address)).to.equal(bn(1));
  });
});
