const { expect } = require("chai");
const {
  parseUnits,
  expectError,
  deployRegistry,
  deploySwap
} = require("./utilities");

describe("LpTokenVestingKeeper", function() {
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

    this.Voters = await ethers.getContractFactory("Voters");
    this.voters = await this.Voters.deploy(
      this.signer.address,
      this.token0.address,
      this.token1.address
    );
    await this.voters.deployed();

    this.DAO = await ethers.getContractFactory("DAO");
    this.dao = await this.DAO.deploy(this.voters.address, 1, 10, 100, 10);
    await this.dao.deployed();

    this.VotersInvestmentDispenser = await ethers.getContractFactory(
      "VotersInvestmentDispenser"
    );
    this.vid = await this.VotersInvestmentDispenser.deploy(
      this.token0.address,
      this.voters.address
    );
    await this.vid.deployed();

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

    this.LpTokenVestingKeeper = await ethers.getContractFactory(
      "LpTokenVestingKeeper"
    );
    this.keeper = await this.LpTokenVestingKeeper.deploy(
      this.vid.address,
      this.swapRouter.address,
      this.token0.address,
      this.dao.address,
      this.signers[1].address,
      this.signer.address
    );
    await this.keeper.deployed();

    await this.token0.approve(this.voters.address, parseUnits("10"));
    await this.voters.lock(parseUnits("10"));

    await this.token0.transfer(this.lpTokenVesting.address, parseUnits("10"));
    await this.token1.transfer(this.lpTokenVesting.address, parseUnits("50"));
    await this.lpTokenVesting.lock();
    await this.lpTokenVesting.toggleOwner(0, this.keeper.address);
    await ethers.provider.send("evm_increaseTime", [1000000]);
    const pair = await this.lpTokenVesting.pair();
    this.pairToken = this.MockToken.attach(pair);

    await this.voters.snapshot();
    this.snapshotId = this.voters.currentSnapshotId();
    await this.keeper.addLpVester(this.lpTokenVesting.address, this.snapshotId);
  });

  it("run", async function() {
    await this.keeper.run();
    await expectError("should not run", async () => await this.keeper.run());
    expect(await this.token0.balanceOf(this.vid.address)).to.equal(
      parseUnits("0.312019800793500727")
    );
    expect(await this.token0.balanceOf(this.voters.address)).to.equal(
      parseUnits("10.312019800793500727")
    );
    expect(await this.token0.balanceOf(this.signers[1].address)).to.equal(
      parseUnits("0.044574257256214389")
    );
    expect(await this.token0.balanceOf(this.dao.address)).to.equal(
      parseUnits("0.222871286281071949")
    );
  });
});
