const { expect } = require("chai");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const {
  deployRegistry,
  currentTime,
  advanceToTime,
  expectError,
  bn,
  ADDRESS_ZERO
} = require("./utilities");

describe("SaleTiers", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];
    this.Sale = await ethers.getContractFactory("SaleTiers");
    this.MockToken = await ethers.getContractFactory("MockToken");

    this.paymentToken = await this.MockToken.deploy();
    await this.paymentToken.deployed();
    this.offeringToken = await this.MockToken.deploy();
    await this.offeringToken.deployed();

    const users = [
      { address: this.signers[0].address, amount: bn("90") },
      { address: this.signers[1].address, amount: bn("10") }
    ];
    // equal to keccak256(abi.encodePacked(account, amount));
    const elements = users.map(x =>
      ethers.utils.solidityKeccak256(
        ["address", "uint256"],
        [x.address, x.amount]
      )
    );
    this.merkleTree = new MerkleTree(elements, keccak256, { sort: true });
    this.root = this.merkleTree.getHexRoot();
    this.proofs = [
      this.merkleTree.getHexProof(elements[0]),
      this.merkleTree.getHexProof(elements[1])
    ];

    this.start = (await currentTime()).toNumber();
    this.sale = await this.Sale.deploy(
      this.paymentToken.address,
      this.offeringToken.address,
      this.root,
      this.start + 1000,
      this.start + 5000,
      bn("500"),
      bn("100"),
      bn("1", 12).div(10), // 10%
      bn("300", 0) // 5 minutes
    );
    await this.sale.deployed();
    await this.offeringToken.transfer(this.sale.address, bn("2000"));
    await this.paymentToken.approve(this.sale.address, bn("100"));
    await this.paymentToken.transfer(this.signers[1].address, bn("100"));
    await this.paymentToken
      .connect(this.signers[1])
      .approve(this.sale.address, bn("100"));
  });

  it("setAmounts", async function() {
    await this.sale.setAmounts(bn("2"), bn("1"));
    expect(await this.sale.raisingAmount()).to.equal(bn("1"));
    expect(await this.sale.offeringAmount()).to.equal(bn("2"));
  });

  it("setVesting", async function() {
    await this.sale.setVesting(bn("4", 10), bn("3"));
    expect(await this.sale.vestingInitial()).to.equal(bn("4", 10));
    expect(await this.sale.vestingDuration()).to.equal(bn("3"));
  });

  it("setPaused", async function() {
    expect(await this.sale.paused()).to.equal(false);
    await this.sale.setPaused(true);
    expect(await this.sale.paused()).to.equal(true);
  });

  it("deposit", async function() {
    await expectError("not active", async () => {
      await this.sale.deposit(bn("50"), bn("90"), this.proofs[0]);
    });

    await advanceToTime(this.start + 1001);
    await this.sale.deposit(bn("50"), bn("90"), this.proofs[0]);

    let userInfo = await this.sale.getUserInfo(this.signer.address);
    expect(userInfo[0]).to.equal(bn("50"));
    expect(userInfo[2]).to.equal(bn("250"));
    expect(await this.sale.totalAmount()).to.equal(bn("50"));

    await expectError("over allocation", async () => {
      await this.sale.deposit(bn("50"), bn("90"), this.proofs[0]);
    });
    await expectError("need amount > 0", async () => {
      await this.sale.deposit(bn("0"), bn("90"), this.proofs[0]);
    });
    await expectError("invalid proof", async () => {
      await this.sale.deposit(bn("1"), bn("90"), this.proofs[1]);
    });
    await expectError("invalid proof", async () => {
      await this.sale
        .connect(this.signers[1])
        .deposit(bn("1"), bn("10"), this.proofs[0]);
    });
    await this.sale
      .connect(this.signers[1])
      .deposit(bn("9"), bn("10"), this.proofs[1]);

    // FCFS
    await advanceToTime(this.start + 5001);
    await expectError("over allocation", async () => {
      await this.sale.deposit(bn("40.26"), bn("90"), this.proofs[0]);
    });
    await this.sale.deposit(bn("40.25"), bn("90"), this.proofs[0]);
    userInfo = await this.sale.getUserInfo(this.signer.address);
    expect(userInfo[0]).to.equal(bn("90.25"));
    expect(await this.sale.totalAmount()).to.equal(bn("99.25"));

    await this.sale.setPaused(true);
    await expectError("paused", async () => {
      await this.sale.deposit(bn("1"), bn("90"), this.proofs[0]);
    });
  });

  it("harvest", async function() {
    await expectError("sale not ended", async () => {
      await this.sale.harvest();
    });

    await advanceToTime(this.start + 1001);
    let balanceBefore = await this.paymentToken.balanceOf(
      this.signers[0].address
    );
    await this.sale.deposit(bn("90"), bn("90"), this.proofs[0]);
    let balanceAfter = await this.paymentToken.balanceOf(
      this.signers[0].address
    );
    expect(balanceBefore.sub(balanceAfter).gte(bn("90"))).to.equal(true);
    await advanceToTime(this.start + 5001);

    await expectError("not finalized", async () => {
      await this.sale.harvest();
    });

    balanceBefore = await this.offeringToken.balanceOf(this.signer.address);
    await this.sale.setFinalized();
    await this.sale.harvest();
    balanceAfter = await this.offeringToken.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn("50.4"));

    let userInfo = await this.sale.getUserInfo(this.signer.address);
    expect(userInfo[3]).to.equal(bn("50.4"));
    expect(userInfo[3].sub(userInfo[1])).to.equal(bn("0"));

    await advanceToTime(this.start + 5001 + 300);
    //await this.signer.sendTransaction({ to: this.signer.address, value: bn("1") });
    userInfo = await this.sale.getUserInfo(this.signer.address);
    expect(userInfo[3]).to.equal(bn("450"));

    balanceBefore = await this.offeringToken.balanceOf(this.signer.address);
    await this.sale.harvest();
    balanceAfter = await this.offeringToken.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn("399.6"));
    userInfo = await this.sale.getUserInfo(this.signer.address);
    expect(userInfo[0]).to.equal(bn("90"));
    expect(userInfo[1]).to.equal(bn("450"));
    expect(userInfo[2]).to.equal(bn("450"));
    expect(userInfo[3]).to.equal(bn("450"));

    await expectError("no amount available for claiming", async () => {
      await this.sale.harvest();
    });
    await expectError("have you participated?", async () => {
      await this.sale.connect(this.signers[1]).harvest();
    });
  });

  it("withdrawToken", async function() {
    // ETH
    // await advanceToTime(this.start + 1001);
    // await this.sale.deposit(bn("90"), this.proofs[0], { value: bn("90") });
    // let balanceBefore = await this.signer.getBalance();
    // await this.sale.withdrawToken(ADDRESS_ZERO, bn("2.5"));
    // let balanceAfter = await this.signer.getBalance();
    // expect(balanceAfter.sub(balanceBefore).gt(bn("2.49"))).to.equal(true);

    // Token
    await this.offeringToken.transfer(this.sale.address, bn("2"));
    balanceBefore = await this.offeringToken.balanceOf(this.signer.address);
    await this.sale.withdrawToken(this.offeringToken.address, bn("1.23"));
    balanceAfter = await this.offeringToken.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn("1.23"));
  });
});
