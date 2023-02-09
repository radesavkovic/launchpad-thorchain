const { expect } = require("chai");
const {
  ADDRESS_ZERO,
  parseUnits,
  expectError,
  deployRegistry
} = require("./utilities");

describe("EmissionsPrivateDispenser", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];
    this.EmissionsPrivateDispenser = await ethers.getContractFactory(
      "EmissionsPrivateDispenser"
    );
    this.MockToken = await ethers.getContractFactory("MockToken");

    this.token = await this.MockToken.deploy();
    await this.token.deployed();

    this.epd = await this.EmissionsPrivateDispenser.deploy(
      this.token.address,
      [this.signer.address, "0x0000000000000000000000000000000000000001"],
      [parseUnits("0.4", 12), parseUnits("0.6", 12)]
    );
    await this.epd.deployed();
  });

  it("constructor", async function() {
    const percentage = await this.epd.investorsPercentages(this.signer.address);
    expect(percentage).to.equal(parseUnits("0.4", 12));

    await expectError("don't add up to 100%", async () => {
      await this.EmissionsPrivateDispenser.deploy(
        this.token.address,
        ["0x0000000000000000000000000000000000000001"],
        [parseUnits("0.99", 12)]
      );
    });
  });

  it("updateInvestorAddress", async function() {
    const newAddress = this.signers[1].address;
    await this.epd.updateInvestorAddress(this.signer.address, newAddress);
    expect(await this.epd.investorsPercentages(this.signer.address)).to.equal(
      0
    );
    expect(await this.epd.investorsPercentages(newAddress)).to.equal(
      parseUnits("0.4", 12)
    );
  });

  it("claimable", async function() {
    expect(await this.epd.claimable(this.signer.address)).to.equal(0);
    await this.token.approve(this.epd.address, parseUnits("1000"));
    await this.epd.deposit(parseUnits("1000"));
    expect(await this.epd.claimable(this.signer.address)).to.equal(
      parseUnits("400")
    );
    expect(await this.epd.claimable(this.signers[1].address)).to.equal(0);
  });

  it("claim", async function() {
    expectError("nothing to claim", () => this.epd.claim());

    await this.token.approve(this.epd.address, parseUnits("1000"));
    await this.epd.deposit(parseUnits("1000"));

    let balanceBefore = await this.token.balanceOf(this.signer.address);
    await this.epd.claim();
    let balanceAfter = await this.token.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("400"));
    expect(await this.epd.investorsClaimedAmount(this.signer.address)).to.equal(
      parseUnits("400")
    );

    await this.token.approve(this.epd.address, parseUnits("200"));
    await this.epd.deposit(parseUnits("200"));
    balanceBefore = await this.token.balanceOf(this.signer.address);
    await this.epd.claim();
    balanceAfter = await this.token.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("80"));

    expectError("nothing to claim", () => this.epd.claim());
  });
});
