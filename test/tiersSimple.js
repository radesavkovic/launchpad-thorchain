const { expect, assert } = require("chai");
const {
  expectError,
  advanceTimeAndBlock,
  prepare,
  deploy,
  bn,
  ADDRESS_ZERO
} = require("./utilities");

describe("TiersSimple", function() {
  before(async function() {
    await prepare(this, ["ERC20Mock", "TiersSimple"]);
  });

  beforeEach(async function() {
    await deploy(this, [["token", this.ERC20Mock, ["Token", "TKN", bn(1000)]]]);
    await deploy(this, [["tiers", this.TiersSimple, [this.token.address]]]);
  });

  it("deposit", async function() {
    await this.token.approve(this.tiers.address, bn(10));
    const balanceBefore = await this.token.balanceOf(this.alice.address);
    await expect(this.tiers.deposit(bn(10)))
      .to.emit(this.tiers, "Deposit")
      .withArgs(this.alice.address, bn(10));
    const balanceAfter = await this.token.balanceOf(this.alice.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(-10));
    expect((await this.tiers.userInfos(this.alice.address))[0]).to.equal(
      bn(10)
    );

    await this.tiers.setPaused(true);
    await expectError("paused", () => this.tiers.deposit(bn(1)));
  });

  it("withdraw", async function() {
    await this.token.approve(this.tiers.address, bn(10));
    await this.tiers.deposit(bn(10));
    await advanceTimeAndBlock(8 * 24 * 60 * 60);
    const balanceBefore = await this.token.balanceOf(this.alice.address);
    await expect(this.tiers.withdraw(bn(5)))
      .to.emit(this.tiers, "Withdraw")
      .withArgs(this.alice.address, bn(5));
    const balanceAfter = await this.token.balanceOf(this.alice.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(5));
    expect((await this.tiers.userInfos(this.alice.address))[0]).to.equal(bn(5));

    await this.tiers.setPaused(true);
    await expectError("paused", () => this.tiers.withdraw(bn(1)));
  });

  it("rescueTokens", async function() {
    await this.token.transfer(this.tiers.address, bn(2));

    await expectError("not the owner", () =>
      this.tiers.connect(this.bob).rescueTokens(this.token.address, bn(2))
    );

    const before = await this.token.balanceOf(this.alice.address);
    await this.tiers.rescueTokens(this.token.address, bn(2));
    const after = await this.token.balanceOf(this.alice.address);
    expect(after.sub(before)).to.equal(bn(2));
  });
});
