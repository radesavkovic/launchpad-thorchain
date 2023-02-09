const { expect } = require("chai");
const { upgrades } = require("hardhat");
const {
  ADDRESS_ZERO,
  ADDRESS_DEAD,
  bn,
  deployRegistry,
  expectError,
  advanceTime
} = require("./utilities");

describe("Forge", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];

    this.MockToken = await ethers.getContractFactory("MockToken");
    this.token = await this.MockToken.deploy();
    await this.token.deployed();
    await this.token.transfer(this.signers[1].address, bn(100));
    await this.token.transfer(this.signers[2].address, bn(100));

    this.Forge = await ethers.getContractFactory("ForgeV1");
    this.forge = await upgrades.deployProxy(this.Forge, [
      this.signer.address,
      ADDRESS_DEAD,
      this.token.address,
      15,
      1095,
      600000000,
      10000000
    ]);
  });

  it("initialize", async function() {
    await expectError("already initialized", () =>
      this.forge.initialize(
        this.signer.address,
        ADDRESS_DEAD,
        this.token.address,
        15,
        1095,
        600000000,
        10000000
      )
    );
  });

  it("setPaused", async function() {
    expect(await this.forge.paused()).to.equal(false);
    this.forge.setPaused(true);
    expect(await this.forge.paused()).to.equal(true);
    await expectError("missing role", () =>
      this.forge.connect(this.signers[1]).setPaused(true)
    );
  });

  it("setUnlockFeeRecipient", async function() {
    expect(await this.forge.unlockFeeRecipient()).to.equal(ADDRESS_DEAD);
    this.forge.setUnlockFeeRecipient(ADDRESS_ZERO);
    expect(await this.forge.unlockFeeRecipient()).to.equal(ADDRESS_ZERO);
    await expectError("missing role", () =>
      this.forge.connect(this.signers[1]).setUnlockFeeRecipient(ADDRESS_DEAD)
    );
  });

  it("stake", async function() {
    await this.token.approve(this.forge.address, bn(11));

    await expectError("invalid lockDays", () => this.forge.stake(bn(1), 14));
    await expectError("invalid lockDays", () => this.forge.stake(bn(1), 1096));

    const balanceBefore = await this.token.balanceOf(this.signer.address);
    await expect(this.forge.stake(bn(10), 60))
      .to.emit(this.forge, "Staked")
      .withArgs(this.signer.address, bn(10), 60, bn("19.863023698630136986"));
    const balanceAfter = await this.token.balanceOf(this.signer.address);

    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(-10));
    expect((await this.forge.getUserInfo(this.signer.address))[1]).to.equal(
      bn("19.863023698630136986")
    );
    expect(await this.forge.totalSupply()).to.equal(
      bn("19.863023698630136986")
    );
    expect(await this.forge.usersLength()).to.equal(1);
    expect(await this.forge.allUsers(0)).to.equal(this.signer.address);

    await this.forge.setPaused(true);
    await expectError("paused", () => this.forge.stake(bn(1), 60));

    await expectError("non-transferable", () =>
      this.forge.transfer(this.signer.address, 1)
    );
  });

  it("unstake", async function() {
    await this.token.approve(this.forge.address, bn(11));
    await this.forge.stake(bn(10), 60);
    await advanceTime(61 * 24 * 60 * 60);

    const balanceBefore = await this.token.balanceOf(this.signer.address);
    await this.forge.unstake(0);
    const balanceAfter = await this.token.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn(10));

    await expectError("already unstaked", () => this.forge.unstake(0));
    await expectError("invalid index", () => this.forge.unstake(1));
  });

  it("unstakeEarly", async function() {
    await this.token.approve(this.forge.address, bn(11));
    await this.forge.stake(bn(10), 60);
    await advanceTime(30 * 24 * 60 * 60);

    const balanceBefore = await this.token.balanceOf(this.signer.address);
    await this.forge.unstakeEarly(0);
    const balanceAfter = await this.token.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn("5"));
    expect(await this.token.balanceOf(ADDRESS_DEAD)).to.equal(bn("5"));

    await expectError("already unstaked", () => this.forge.unstakeEarly(0));
    await expectError("invalid index", () => this.forge.unstakeEarly(1));

    await this.forge.stake(bn(1), 15);
    await advanceTime(16 * 24 * 60 * 60);
    await expectError("not early", () => this.forge.unstakeEarly(1));

    await this.forge.setPaused(true);
    await expectError("paused", () => this.forge.unstakeEarly(0));
  });

  it("usersPage", async function() {
    const data = ethers.utils.defaultAbiCoder.encode(["uint256"], ["30"]);
    await this.token
      .connect(this.signers[0])
      .transferAndCall(this.forge.address, bn(1), data);
    await this.token
      .connect(this.signers[1])
      .transferAndCall(this.forge.address, bn(1), data);
    await this.token
      .connect(this.signers[2])
      .transferAndCall(this.forge.address, bn(1), data);
    let page = await this.forge.usersPage(0, 2);
    expect(page[0]).to.equal(this.signers[0].address);
    expect(page[1]).to.equal(this.signers[1].address);
    page = await this.forge.usersPage(1, 2);
    expect(page[0]).to.equal(this.signers[2].address);
    expect(page[1]).to.equal(ADDRESS_ZERO);
  });

  it("userStakes", async function() {
    const data = ethers.utils.defaultAbiCoder.encode(["uint256"], ["30"]);
    await this.token.transferAndCall(this.forge.address, bn(1), data);
    await this.token.transferAndCall(this.forge.address, bn(2), data);
    await this.token.transferAndCall(this.forge.address, bn(3), data);
    let [
      amounts,
      shares,
      lockTimes,
      lockDays,
      unstakedTimes
    ] = await this.forge.userStakes(this.signer.address, 0, 2);
    expect(amounts[0]).to.equal(bn(1));
    expect(amounts[1]).to.equal(bn(2));
    expect(lockDays[0]).to.equal(30);
    expect(lockDays[1]).to.equal(30);
    const values = await this.forge.userStakes(this.signer.address, 1, 2);
    expect(values[0][0]).to.equal(bn(3));
    expect(values[0][1]).to.equal(0);

    const info = await this.forge.getUserInfo(this.signer.address);
    expect(info[0]).to.equal(bn(6));
    expect(info[2]).to.equal(3);
    expect(await this.forge.userStakeCount(this.signer.address)).to.equal(3);
  });

  it("calculateShares", async function() {
    let amounts = [
      bn(10),
      bn(100),
      bn(1000),
      bn(10000),
      bn(50000),
      bn(250000),
      bn(1000000),
      bn(3000000),
      bn(10000000),
      bn(75000000)
    ];
    for (let n of amounts) {
      const totals = await this.forge.calculateShares(n, "60");
      const bonus = totals[0].sub(totals[1]).sub(n);
      /*
      console.log(
        ethers.utils.formatUnits(n),
        ethers.utils.formatUnits(bonus),
        ethers.utils.formatUnits(totals[0])
      );
      */
    }
  });
});
