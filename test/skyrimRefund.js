const { expect } = require("chai");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const {
  deployRegistry,
  expectError,
  bn
} = require("./utilities");

describe("SkyrimRefund", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];
    this.SkyrimRefund = await ethers.getContractFactory("SkyrimRefund");
    this.MockToken = await ethers.getContractFactory("MockToken");

    this.tokenInput = await this.MockToken.deploy();
    await this.tokenInput.deployed();
    this.tokenOutput = await this.MockToken.deploy();
    await this.tokenOutput.deployed();

    const users = [
      { address: this.signers[0].address, amount: bn("90") },
      { address: this.signers[1].address, amount: bn("10") },
    ];
    const elements = users.map((x) =>
      ethers.utils.solidityKeccak256(["address", "uint256"], [x.address, x.amount])
    );
    this.merkleTree = new MerkleTree(elements, keccak256, { sort: true });
    this.root = this.merkleTree.getHexRoot();
    this.proofs = [this.merkleTree.getHexProof(elements[0]), this.merkleTree.getHexProof(elements[1])];

    this.skyrimRefund = await this.SkyrimRefund.deploy(
        bn("2.5", 12),
        this.tokenInput.address,
        this.tokenOutput.address,
        this.root,
    );
    await this.skyrimRefund.deployed();
    await this.tokenOutput.transfer(this.skyrimRefund.address, bn("250"));
  });

  it("setPaused", async function() {
    expect(await this.skyrimRefund.paused()).to.equal(false);
    await this.skyrimRefund.setPaused(true);
    expect(await this.skyrimRefund.paused()).to.equal(true);
  });

  it("transfer", async function() {
    await this.tokenInput.approve(this.skyrimRefund.address, bn("100"));
    await expectError("over allocation", async () => {
      await this.skyrimRefund.deposit(bn("91"), bn("90"), this.proofs[0]);
    });
    await expectError("need amount > 0", async () => {
      await this.skyrimRefund.deposit(bn("0"), bn("90"), this.proofs[0]);
    });
    await expectError("invalid proof", async () => {
      await this.skyrimRefund.deposit(bn("50"), bn("90"), this.proofs[1]);
    });

    let balanceBefore = await this.tokenOutput.balanceOf(this.signer.address);
    await this.skyrimRefund.deposit(bn("50"), bn("90"), this.proofs[0]);
    let balanceAfter = await this.tokenOutput.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn("125"));
    expect(await this.skyrimRefund.deposits(this.signer.address)).to.equal(bn("50"));
    expect(await this.skyrimRefund.totalDeposits()).to.equal(bn("50"));
    expect(await this.skyrimRefund.totalUsers()).to.equal("1");

    balanceBefore = await this.tokenOutput.balanceOf(this.signer.address);
    await this.skyrimRefund.deposit(bn("5"), bn("90"), this.proofs[0]);
    balanceAfter = await this.tokenOutput.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn("12.5"));
    expect(await this.skyrimRefund.totalUsers()).to.equal("1");

    await this.skyrimRefund.setPaused(true);
    await expectError("paused", async () => {
      await this.skyrimRefund.deposit(bn("1"), bn("90"), this.proofs[0]);
    });
  });

  it("withdrawToken", async function() {
    await this.tokenOutput.transfer(this.skyrimRefund.address, bn("2"));
    balanceBefore = await this.tokenOutput.balanceOf(this.signer.address);
    await this.skyrimRefund.withdrawToken(this.tokenOutput.address, bn("1.23"));
    balanceAfter = await this.tokenOutput.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(bn("1.23"));
  });
});
