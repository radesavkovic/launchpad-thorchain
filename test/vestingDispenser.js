const { expect } = require("chai");
const {
  ADDRESS_ZERO,
  parseUnits,
  expectError,
  deployRegistry,
  advanceToTime,
  advanceBlock
} = require("./utilities");

describe("EmissionsPrivateDispenser", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];
    this.VestingDispenser = await ethers.getContractFactory("VestingDispenser");
    this.MockToken = await ethers.getContractFactory("MockToken");

    this.token = await this.MockToken.deploy();
    await this.token.deployed();

    this.vestingDispenser = await this.VestingDispenser.deploy(
      this.token.address
    );
    await this.vestingDispenser.deployed();

    await this.token.transfer(
      this.vestingDispenser.address,
      parseUnits("1000")
    );
    await this.vestingDispenser.deposit(
      this.signer.address,
      0,
      100000,
      parseUnits("1000")
    );
  });

  it("deposit", async function() {
    await expectError("not the owner", () =>
      this.vestingDispenser
        .connect(this.signers[1])
        .deposit(this.signer.address, 0, 1, 1)
    );
  });

  it("updateAddress", async function() {
    const newAddress = this.signers[1].address;
    expect((await this.vestingDispenser.info(this.signer.address))[2]).to.equal(
      parseUnits("1000")
    );
    await this.vestingDispenser.updateAddress(this.signer.address, newAddress);
    expect(
      (await this.vestingDispenser.info(this.signers[1].address))[2]
    ).to.equal(parseUnits("1000"));
    expect((await this.vestingDispenser.info(this.signer.address))[2]).to.equal(
      parseUnits("0")
    );

    await expectError("not the owner", () =>
      this.vestingDispenser
        .connect(this.signers[1])
        .updateAddress(this.signer.address, this.signers[1].address)
    );
  });

  it("removeAddress", async function() {
    expect((await this.vestingDispenser.info(this.signer.address))[2]).to.equal(
      parseUnits("1000")
    );
    await this.vestingDispenser.removeAddress(this.signer.address);
    expect((await this.vestingDispenser.info(this.signer.address))[2]).to.equal(
      parseUnits("0")
    );

    await expectError("not the owner", () =>
      this.vestingDispenser
        .connect(this.signers[1])
        .removeAddress(this.signer.address)
    );
  });

  it("claimable", async function() {
    const start = (
      await this.vestingDispenser.info(this.signer.address)
    )[0].toNumber();

    // 50% vested
    await advanceToTime(start + 50000);
    await advanceBlock();
    expect(await this.vestingDispenser.claimable(this.signer.address)).to.equal(
      parseUnits("500")
    );
    expect(
      await this.vestingDispenser.claimable(this.signers[1].address)
    ).to.equal(0);

    // Caps vested amount to 100%
    await advanceToTime(start + 111000);
    await advanceBlock();
    expect(await this.vestingDispenser.claimable(this.signer.address)).to.equal(
      parseUnits("1000")
    );
  });

  it("claim", async function() {
    const start = (
      await this.vestingDispenser.info(this.signer.address)
    )[0].toNumber();

    let balanceBefore = await this.token.balanceOf(this.signer.address);
    await advanceToTime(start + 40000);
    await advanceBlock();
    await this.vestingDispenser.claim();
    let balanceAfter = await this.token.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("400.01"));
    expect((await this.vestingDispenser.info(this.signer.address))[3]).to.equal(
      parseUnits("400.01")
    );

    await expectError("nothing to claim", () =>
      this.vestingDispenser.connect(this.signers[1]).claim()
    );
  });
});
