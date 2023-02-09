const { expect, assert } = require("chai");
const {
  expectError,
  advanceBlockTo,
  advanceBlock,
  prepare,
  deploy,
  getBigNumber,
  ADDRESS_ZERO
} = require("./utilities");

describe("Staking", function() {
  before(async function() {
    await prepare(this, ["XRUNE", "ERC20Mock", "Staking"]);
  });

  beforeEach(async function() {
    await deploy(this, [["rewardToken", this.XRUNE, [this.dev.address]]]);

    await deploy(this, [
      ["token", this.ERC20Mock, ["Token", "TKN", getBigNumber(10)]],
      [
        "staking",
        this.Staking,
        [this.rewardToken.address, this.dev.address, getBigNumber(100)]
      ]
    ]);

    await this.rewardToken
      .connect(this.dev)
      .approve(this.staking.address, getBigNumber(100000));
  });

  describe("PoolLength", function() {
    it("PoolLength should execute", async function() {
      await this.staking.add(getBigNumber(10), this.token.address);
      expect(await this.staking.poolLength()).to.be.equal(1);
    });
  });

  describe("Set", function() {
    it("Should emit event LogSetPool", async function() {
      await this.staking.add(10, this.token.address);
      await expect(this.staking.set(0, 10))
        .to.emit(this.staking, "LogSetPool")
        .withArgs(0, 10);
    });

    it("Should revert if invalid pool", async function() {
      await expectError("revert", () => this.staking.set(0, 10));
    });
  });

  describe("PendingRewards", function() {
    it("PendingRewards should equal ExpectedRewards", async function() {
      await this.staking.add(10, this.token.address);
      await this.staking.add(10, this.rewardToken.address);
      await this.token.approve(this.staking.address, getBigNumber(10));
      let log = await this.staking.deposit(
        0,
        getBigNumber(1),
        this.alice.address
      );
      await advanceBlock();
      let log2 = await this.staking.updatePool(0);
      await advanceBlock();
      let expected = getBigNumber(100)
        .mul(log2.blockNumber + 1 - log.blockNumber)
        .div(2);
      let pending = await this.staking.pendingRewards(0, this.alice.address);
      expect(pending).to.be.equal(expected);
    });
    it("When block is lastRewardBlock", async function() {
      await this.staking.add(10, this.token.address);
      await this.token.approve(this.staking.address, getBigNumber(1));
      let log = await this.staking.deposit(
        0,
        getBigNumber(1),
        this.alice.address
      );
      await advanceBlockTo(3);
      let log2 = await this.staking.updatePool(0);
      let expected = getBigNumber(100).mul(log2.blockNumber - log.blockNumber);
      let pending = await this.staking.pendingRewards(0, this.alice.address);
      expect(pending).to.be.equal(expected);
    });
  });

  describe("MassUpdatePools", function() {
    it("Should call updatePool", async function() {
      await this.staking.add(10, this.token.address);
      await advanceBlockTo(1);
      await this.staking.massUpdatePools([0]);
      //expect('updatePool').to.be.calledOnContract(); // not suported by hardhat
      //expect('updatePool').to.be.calledOnContractWith(0); // not suported by hardhat
    });

    it("Updating invalid pools should fail", async function() {
      await expectError("revert", () =>
        this.staking.massUpdatePools([0, 10000, 100000])
      );
    });
  });

  describe("Add", function() {
    it("Should add pool with reward token multiplier", async function() {
      await expect(this.staking.add(10, this.token.address))
        .to.emit(this.staking, "LogPoolAddition")
        .withArgs(0, 10, this.token.address);
    });
  });

  describe("UpdatePool", function() {
    it("Should emit event LogUpdatePool", async function() {
      await this.staking.add(10, this.token.address);
      await advanceBlockTo(1);
      await expect(this.staking.updatePool(0))
        .to.emit(this.staking, "LogUpdatePool")
        .withArgs(
          0,
          (await this.staking.poolInfo(0)).lastRewardBlock,
          await this.token.balanceOf(this.staking.address),
          (await this.staking.poolInfo(0)).accRewardPerShare
        );
    });

    it("Should take else path", async function() {
      await this.staking.add(10, this.token.address);
      await advanceBlockTo(1);
      await this.staking.multicall([
        this.staking.interface.encodeFunctionData("updatePool", [0]),
        this.staking.interface.encodeFunctionData("updatePool", [0])
      ]);
    });
  });

  describe("Deposit", function() {
    it("Depositing 0 amount", async function() {
      await this.staking.add(10, this.token.address);
      await this.token.approve(this.staking.address, getBigNumber(10));
      await expect(this.staking.deposit(0, getBigNumber(0), this.alice.address))
        .to.emit(this.staking, "Deposit")
        .withArgs(this.alice.address, 0, 0, this.alice.address);
    });

    it("Depositing into non-existent pool should fail", async function() {
      await expectError("revert", () =>
        this.staking.deposit(1001, getBigNumber(0), this.alice.address)
      );
    });
  });

  describe("Withdraw", function() {
    it("Withdraw 0 amount", async function() {
      await this.staking.add(10, this.token.address);
      await expect(
        this.staking.withdraw(0, getBigNumber(0), this.alice.address)
      )
        .to.emit(this.staking, "Withdraw")
        .withArgs(this.alice.address, 0, 0, this.alice.address);
    });
  });

  describe("Harvest", function() {
    it("Should give back the correct amount of reward token", async function() {
      await this.staking.add(10, this.token.address);
      await this.token.approve(this.staking.address, getBigNumber(10));
      expect(await this.staking.lpToken(0)).to.be.equal(this.token.address);
      let log = await this.staking.deposit(
        0,
        getBigNumber(1),
        this.alice.address
      );
      await advanceBlockTo(20);
      let log2 = await this.staking.withdraw(
        0,
        getBigNumber(1),
        this.alice.address
      );
      let expected = getBigNumber(100).mul(log2.blockNumber - log.blockNumber);
      expect(
        (await this.staking.userInfo(0, this.alice.address)).rewardDebt
      ).to.be.equal("-" + expected);
      await this.staking.harvest(0, this.alice.address);
      expect(await this.rewardToken.balanceOf(this.alice.address))
        .to.be.equal(await this.rewardToken.balanceOf(this.alice.address))
        .to.be.equal(expected);
    });
    it("Harvest with empty user balance", async function() {
      await this.staking.add(10, this.token.address);
      await this.staking.harvest(0, this.alice.address);
    });

    it("Harvest for reward token-only pool", async function() {
      await this.staking.add(10, this.token.address);
      await this.token.approve(this.staking.address, getBigNumber(10));
      expect(await this.staking.lpToken(0)).to.be.equal(this.token.address);
      await this.staking.deposit(0, getBigNumber(1), this.bob.address);
      let log = await this.staking.deposit(
        0,
        getBigNumber(1),
        this.alice.address
      );
      await advanceBlock();
      let log2 = await this.staking.withdraw(
        0,
        getBigNumber(1),
        this.alice.address
      );
      let expected = getBigNumber(100)
        .mul(log2.blockNumber - log.blockNumber)
        .div(2);
      expect(
        (await this.staking.userInfo(0, this.alice.address)).rewardDebt
      ).to.be.equal("-" + expected);
      await this.staking.harvest(0, this.alice.address);
      expect(await this.rewardToken.balanceOf(this.alice.address)).to.be.equal(
        expected
      );
    });
  });

  describe("EmergencyWithdraw", function() {
    it("Should emit event EmergencyWithdraw", async function() {
      await this.staking.add(10, this.token.address);
      await this.token.approve(this.staking.address, getBigNumber(10));
      await this.staking.deposit(0, getBigNumber(1), this.bob.address);
      //await this.staking.emergencyWithdraw(0, this.alice.address)
      await expect(
        this.staking.connect(this.bob).emergencyWithdraw(0, this.bob.address)
      )
        .to.emit(this.staking, "EmergencyWithdraw")
        .withArgs(this.bob.address, 0, getBigNumber(1), this.bob.address);
    });
  });
});
