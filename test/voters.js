const { expect } = require("chai");
const { deployRegistry, expectError } = require("./utilities");

const parseUnits = ethers.utils.parseUnits;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("Voters", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];

    this.MockToken = await ethers.getContractFactory("MockToken");
    this.token = await this.MockToken.deploy();
    await this.token.deployed();
    this.tokenLp = await this.MockToken.deploy();
    await this.tokenLp.deployed();

    this.VotersLockUnlock = await ethers.getContractFactory("VotersLockUnlock");
    this.votersLockUnlock = await this.VotersLockUnlock.deploy();
    await this.votersLockUnlock.deployed();

    this.Voters = await ethers.getContractFactory("Voters");
    this.voters = await this.Voters.deploy(
      this.signer.address,
      this.token.address,
      this.tokenLp.address
    );
    await this.voters.deployed();
  });

  it("delegate", async function() {
    let delegate = (await this.voters.userInfo(this.signer.address))[6];
    expect(delegate).to.equal(ZERO_ADDRESS);
    await this.voters.delegate(this.signer.address);
    delegate = (await this.voters.userInfo(this.signer.address))[6];
    expect(delegate).to.equal(this.signer.address);
  });

  it("lock", async function() {
    await this.token.approve(this.voters.address, parseUnits("10"));
    await this.voters.lock(parseUnits("10"));
    expect(await this.token.balanceOf(this.voters.address)).to.equal(
      parseUnits("10")
    );
    expect((await this.voters.userInfo(this.signer.address))[1]).to.equal(
      parseUnits("10")
    );
    expect(await this.voters.balanceOf(this.signer.address)).to.equal(
      parseUnits("10")
    );
    expect(await this.voters.totalSupply()).to.equal(parseUnits("10"));

    await this.voters.snapshot();
    const currentSnapshotId = await this.voters.currentSnapshotId();
    await this.token.approve(this.voters.address, parseUnits("1"));
    await this.voters.lock(parseUnits("1"));

    expect(await this.voters.totalSupply()).to.equal(parseUnits("11"));
    expect(await this.voters.totalSupplyAt(currentSnapshotId)).to.equal(
      parseUnits("10")
    );
    expect(
      await this.voters.balanceOfAt(this.signer.address, currentSnapshotId)
    ).to.equal(parseUnits("10"));

    await this.token.transferAndCall(
      this.voters.address,
      parseUnits("200"),
      "0x"
    );
    expect((await this.voters.userInfo(this.signer.address))[1]).to.equal(
      parseUnits("211")
    );
  });

  it("delegating updates snapshot", async function() {
    await this.token.approve(this.voters.address, parseUnits("10"));
    await this.voters.lock(parseUnits("10"));
    await this.voters.snapshot();
    const currentSnapshotId = await this.voters.currentSnapshotId();
    expect(
      await this.voters.balanceOfAt(this.signer.address, currentSnapshotId)
    ).to.equal(parseUnits("10"));
    expect(
      await this.voters.votesAt(this.signer.address, currentSnapshotId)
    ).to.equal(parseUnits("10"));
    expect(
      await this.voters.votesAt(this.signers[1].address, currentSnapshotId)
    ).to.equal(parseUnits("0"));

    await this.voters.delegate(this.signers[1].address);

    expect(
      await this.voters.balanceOfAt(this.signer.address, currentSnapshotId)
    ).to.equal(parseUnits("10"));
    expect(
      await this.voters.votesAt(this.signer.address, currentSnapshotId)
    ).to.equal(parseUnits("10"));
    expect(await this.voters.votes(this.signer.address)).to.equal(
      parseUnits("0")
    );
    expect(
      await this.voters.balanceOfAt(this.signers[1].address, currentSnapshotId)
    ).to.equal(parseUnits("0"));
    expect(
      await this.voters.votesAt(this.signers[1].address, currentSnapshotId)
    ).to.equal(parseUnits("0"));
    expect(await this.voters.votes(this.signers[1].address)).to.equal(
      parseUnits("10")
    );
  });

  it("unlock", async function() {
    await this.token.approve(this.voters.address, parseUnits("11"));
    await this.voters.lock(parseUnits("10"));
    await this.voters.unlock(parseUnits("5"));
    expect(await this.token.balanceOf(this.voters.address)).to.equal(
      parseUnits("5")
    );
    expect(await this.voters.balanceOf(this.signer.address)).to.equal(
      parseUnits("5")
    );
    expect(await this.voters.totalSupply()).to.equal(parseUnits("5"));

    await this.voters.snapshot();
    const currentSnapshotId = await this.voters.currentSnapshotId();
    await this.voters.unlock(parseUnits("1"));

    expect(await this.voters.totalSupply()).to.equal(parseUnits("4"));
    expect(await this.voters.totalSupplyAt(currentSnapshotId)).to.equal(
      parseUnits("5")
    );
    expect(
      await this.voters.balanceOfAt(this.signer.address, currentSnapshotId)
    ).to.equal(parseUnits("5"));

    await expectError("no lock-unlock in same tx", async () => {
      await this.token.approve(this.votersLockUnlock.address, parseUnits("1"));
      await this.votersLockUnlock.run(this.voters.address, parseUnits("1"));
    });
  });

  it("lockSslp", async function() {
    // Make it look like the LP token has 100 XRUNE of liquidity
    await this.token.transfer(this.tokenLp.address, parseUnits("100"));

    await this.tokenLp.approve(this.voters.address, parseUnits("125000000"));
    await this.voters.lockSslp(parseUnits("125000000"));
    expect(await this.tokenLp.balanceOf(this.voters.address)).to.equal(
      parseUnits("125000000")
    );
    expect((await this.voters.userInfo(this.signer.address))[2]).to.equal(
      parseUnits("50")
    );
    expect((await this.voters.userInfo(this.signer.address))[3]).to.equal(
      parseUnits("125000000")
    );
    expect(await this.voters.balanceOf(this.signer.address)).to.equal(
      parseUnits("50")
    );
    expect(await this.voters.totalSupply()).to.equal(parseUnits("50"));

    await this.token.approve(this.voters.address, parseUnits("25"));
    await this.voters.lock(parseUnits("25"));
    expect(await this.voters.balanceOf(this.signer.address)).to.equal(
      parseUnits("75")
    );
  });

  it("unlockSslp", async function() {
    // Make it look like the LP token has 100 XRUNE of liquidity
    await this.token.transfer(this.tokenLp.address, parseUnits("100"));

    await this.tokenLp.approve(this.voters.address, parseUnits("125000000"));
    await this.voters.lockSslp(parseUnits("125000000"));
    expect(await this.tokenLp.balanceOf(this.voters.address)).to.equal(
      parseUnits("125000000")
    );

    const balanceBefore = await this.tokenLp.balanceOf(this.signer.address);
    await this.voters.unlockSslp(parseUnits("25000000"));
    const balanceAfter = await this.tokenLp.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("25000000"));
    expect(await this.voters.balanceOf(this.signer.address)).to.equal(
      parseUnits("40")
    );
  });

  it("updateTclp", async function() {
    await expectError("missing role", async () =>
      this.voters.connect(this.signers[1]).updateTclp([], [], [])
    );

    await this.voters.updateTclp(
      [this.signers[1].address],
      [parseUnits("1")],
      [parseUnits("20")]
    );
    const info = await this.voters.userInfo(this.signers[1].address);
    expect(info[4]).to.equal(parseUnits("20"));
    expect(info[5]).to.equal(parseUnits("1"));
    expect(await this.voters.balanceOf(this.signers[1].address)).to.equal(
      parseUnits("20")
    );
    expect(await this.voters.totalSupply()).to.equal(parseUnits("20"));
  });

  it("votes", async function() {
    await this.token.approve(this.voters.address, parseUnits("10"));
    await this.voters.lock(parseUnits("10"));
    expect(await this.voters.votes(this.signer.address)).to.equal(
      parseUnits("10")
    );

    await this.voters.snapshot();
    const currentSnapshotId = await this.voters.currentSnapshotId();
    await this.voters.unlock(parseUnits("1"));

    expect(await this.voters.votes(this.signer.address)).to.equal(
      parseUnits("9")
    );
    expect(
      await this.voters.votesAt(this.signer.address, currentSnapshotId)
    ).to.equal(parseUnits("10"));
  });

  it("historicalTcLpsList", async function() {
    await this.voters.updateTclp(
      ["0x0000000000000000000000000000000000000001"],
      [5],
      [15]
    );
    expect(await this.voters.historicalTcLpsList(0, 3)).to.deep.equal([
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000"
    ]);
  });

  it("donate", async function() {
    await this.token.approve(this.voters.address, parseUnits("10"));
    await this.voters.lock(parseUnits("5")); // Lock before donate so total supply is not 0
    await this.voters.donate(parseUnits("1"));
    await this.voters.lock(parseUnits("1"));

    // User should have 6 vXRUNE and no owned fee growth (but last fee growth snapshotted)
    expect(await this.token.balanceOf(this.voters.address)).to.equal(
      parseUnits("7")
    );
    expect(await this.voters.balanceOf(this.signer.address)).to.equal(
      parseUnits("6")
    );

    // Now the user should be owed 1 XRUNE (they own 100% of the supply)
    await this.voters.donate(parseUnits("1"));
    expect(await this.token.balanceOf(this.voters.address)).to.equal(
      parseUnits("8")
    );
    expect(await this.voters.balanceOf(this.signer.address)).to.equal(
      parseUnits("6")
    );

    // We took an action (unlock 0 tokens) which should have claimed our fee growth
    await this.voters.unlock(parseUnits("0"));
    expect(await this.token.balanceOf(this.voters.address)).to.equal(
      parseUnits("8")
    );
    expect(await this.voters.balanceOf(this.signer.address)).to.equal(
      parseUnits("6.999999999996")
    );
  });
});
