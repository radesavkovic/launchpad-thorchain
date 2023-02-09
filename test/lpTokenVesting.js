const { expect } = require("chai");
const {
  parseUnits,
  expectError,
  ADDRESS_ZERO,
  deployRegistry,
  deploySwap
} = require("./utilities");

describe("LpTokenVesting", function() {
  beforeEach(async function() {
    await deployRegistry();
    await deploySwap.bind(this)();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];

    this.MockToken = await ethers.getContractFactory("MockToken");
    this.token0 = await this.MockToken.deploy();
    await this.token0.deployed();
    this.token1 = await this.MockToken.deploy();
    await this.token1.deployed();

    this.LpTokenVesting = await ethers.getContractFactory("LpTokenVesting");
    this.lpTokenVesting = await this.LpTokenVesting.deploy(
      this.token0.address,
      this.token1.address,
      this.swapRouter.address,
      86400, // Cliff
      10000000, // Length
      [this.signers[0].address, this.signers[1].address]
    );
    await this.lpTokenVesting.deployed();
  });

  it("withdraw", async function() {
    await this.token0.transfer(this.lpTokenVesting.address, parseUnits("10"));
    const balanceBefore = await this.token0.balanceOf(this.signer.address);
    await this.lpTokenVesting.withdraw(this.token0.address, parseUnits("1"));
    const balanceAfter = await this.token0.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("1"));

    await expectError("can only withdraw token", async () => {
      await this.lpTokenVesting.withdraw(ADDRESS_ZERO, parseUnits("1"));
    });
  });

  it("lock", async function() {
    await this.token0.transfer(this.lpTokenVesting.address, parseUnits("10"));
    await this.token1.transfer(this.lpTokenVesting.address, parseUnits("50"));
    await this.lpTokenVesting.lock();
    expect(await this.token0.balanceOf(this.lpTokenVesting.address)).to.equal(
      parseUnits("0")
    );
    expect(await this.token1.balanceOf(this.lpTokenVesting.address)).to.equal(
      parseUnits("0")
    );
    const pair = await this.lpTokenVesting.pair();
    expect(
      await this.MockToken.attach(pair).balanceOf(this.lpTokenVesting.address)
    ).to.equal(parseUnits("22.360679774997895964"));
    expect(await this.token0.balanceOf(pair)).to.equal(parseUnits("10"));
    expect(await this.token1.balanceOf(pair)).to.equal(parseUnits("50"));
  });

  it("lock w/ swap", async function() {
    // Add a small amount of liquidity in not the same ratio as locker
    await this.token0.approve(this.swapRouter.address, parseUnits("0.1"));
    await this.token1.approve(this.swapRouter.address, parseUnits("0.4"));
    await this.swapRouter.addLiquidity(
      this.token0.address,
      this.token1.address,
      parseUnits("0.1"),
      parseUnits("0.4"),
      0,
      0,
      this.signer.address,
      parseUnits(String(Number.MAX_SAFE_INTEGER), 0)
    );

    // Try locking
    await this.token0.transfer(this.lpTokenVesting.address, parseUnits("100"));
    await this.token1.transfer(this.lpTokenVesting.address, parseUnits("500"));
    await this.lpTokenVesting.lock();
    expect(await this.token0.balanceOf(this.lpTokenVesting.address)).to.equal(
      parseUnits("0.338979876184691598")
    );
    expect(await this.token1.balanceOf(this.lpTokenVesting.address)).to.equal(
      parseUnits("0")
    );
    const pair = await this.lpTokenVesting.pair();
    const pairToken = this.MockToken.attach(pair);
    expect(await pairToken.balanceOf(this.lpTokenVesting.address)).to.equal(
      parseUnits("223.192857142857142855")
    );
    expect(await this.lpTokenVesting.initialLpShareAmount()).to.equal(
      parseUnits("223.192857142857142855")
    );
  });

  it("claimable", async function() {
    expect(await this.lpTokenVesting.claimable(0)).to.equal(0);

    await this.token0.transfer(this.lpTokenVesting.address, parseUnits("10"));
    await this.token1.transfer(this.lpTokenVesting.address, parseUnits("50"));
    await this.lpTokenVesting.lock();
    await ethers.provider.send("evm_increaseTime", [2592000]);
    await this.signer.sendTransaction({
      to: this.signer.address,
      value: parseUnits("1")
    });

    expect(await this.lpTokenVesting.claimable(0)).to.equal(
      parseUnits("2.801345962211736406")
    );
    expect(await this.lpTokenVesting.claimable(1)).to.equal(
      parseUnits("2.801345962211736406")
    );
    expect(await this.lpTokenVesting.claimable(2)).to.equal(0);
  });

  it("claim", async function() {
    await this.token0.transfer(this.lpTokenVesting.address, parseUnits("10"));
    await this.token1.transfer(this.lpTokenVesting.address, parseUnits("50"));
    await this.lpTokenVesting.lock();
    await ethers.provider.send("evm_increaseTime", [2592000]);

    const pair = await this.lpTokenVesting.pair();
    const pairToken = this.MockToken.attach(pair);
    let balanceBefore = await pairToken.balanceOf(this.signer.address);
    await this.lpTokenVesting.claim(0);
    let balanceAfter = await pairToken.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(
      parseUnits("2.801345962211736406")
    );
    expect(await this.lpTokenVesting.partyClaimedAmount(0)).to.equal(
      parseUnits("2.801345962211736406")
    );
    await this.lpTokenVesting.claim(0);
    let balanceAfterSecondClaim = await pairToken.balanceOf(
      this.signer.address
    );
    expect(balanceAfterSecondClaim.sub(balanceAfter)).to.equal(parseUnits("0"));

    await ethers.provider.send("evm_increaseTime", [10000000]);
    await this.lpTokenVesting.claim(0);
    expect(await pairToken.balanceOf(this.signer.address)).to.equal(
      parseUnits("11.180339887498947982") // 50% of initial lp
    );
  });
});
