const { expect } = require("chai");
const {
  parseUnits,
  currentTime,
  advanceTime,
  advanceToTime,
  expectError,
  deployRegistry
} = require("./utilities");

describe("SaleDutch", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];
    this.Sale = await ethers.getContractFactory("SaleDutch");
    this.MockToken = await ethers.getContractFactory("MockToken");

    this.paymentToken = await this.MockToken.deploy();
    await this.paymentToken.deployed();
    this.paymentToken.transfer(this.signers[1].address, parseUnits("10000"));

    this.offeringToken = await this.MockToken.deploy();
    await this.offeringToken.deployed();

    this.Voters = await ethers.getContractFactory("Voters");
    this.voters = await this.Voters.deploy(
      this.signer.address,
      this.paymentToken.address,
      this.offeringToken.address
    );
    await this.voters.deployed();

    this.startTime = (await currentTime()).toNumber();
    this.sale = await this.Sale.deploy(
      this.paymentToken.address,
      this.offeringToken.address,
      this.startTime + 30,
      this.startTime + 90,
      parseUnits("0.5"),
      parseUnits("0.25"),
      parseUnits("100"),
      parseUnits("200"),
      this.signer.address
    );
    await this.sale.deployed();
    await this.offeringToken.transfer(this.sale.address, parseUnits("100"));
  });

  it("deposit", async function() {
    await this.paymentToken.approve(this.sale.address, parseUnits("201"));
    await this.paymentToken
      .connect(this.signers[1])
      .approve(this.sale.address, parseUnits("20"));
    await advanceToTime(this.startTime + 30);
    expect(await this.sale.clearingPrice()).to.equal(parseUnits("0.5"));

    await expectError("over per user cap", async () => {
      await this.sale.deposit(parseUnits("201"));
    });

    await this.sale.deposit(parseUnits("40"));
    await this.sale.connect(this.signers[1]).deposit(parseUnits("20"));
    let [amount] = await this.sale.userInfo(this.signer.address);
    expect(amount).to.equal(parseUnits("40"));
    expect(await this.sale.totalAmount()).to.equal(
      parseUnits("49.1666666666666668")
    );
    expect(await this.sale.clearingPrice()).to.equal(
      parseUnits(".491666666666666668")
    );
    expect(await this.sale.getOfferingAmount(this.signer.address)).to.equal(
      parseUnits("81.355932203389830287")
    );

    await expectError("already participated", async () => {
      await this.sale.deposit(parseUnits("1"));
    });

    await this.sale.togglePaused();
    await expectError("paused", async () => {
      await this.sale.deposit(parseUnits("1"));
    });
  });

  it("harvestTokens", async function() {
    await advanceToTime(this.startTime + 30);

    let balanceBefore = await this.paymentToken.balanceOf(this.signer.address);
    await this.paymentToken.transferAndCall(
      this.sale.address,
      parseUnits("51"),
      "0x"
    );
    let balanceAfter = await this.paymentToken.balanceOf(this.signer.address);
    // Only 50 tokens were used, 1 extra was refunded (100 tokens offered at 0.5 start price
    expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("-50"));

    await advanceToTime(this.startTime + 91);

    await expectError("not finalized", async () => {
      await this.sale.harvestTokens();
    });

    balanceBefore = await this.offeringToken.balanceOf(this.signer.address);
    await this.sale.finalize();
    await this.sale.harvestTokens();
    balanceAfter = await this.offeringToken.balanceOf(this.signer.address);
    expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("100"));
    expect(await this.sale.clearingPrice()).to.equal(parseUnits("0.5"));
    expect(await this.sale.currentPrice()).to.equal(parseUnits("0.25"));

    await expectError("already claimed", async () => {
      await this.sale.harvestTokens();
    });
  });

  it("harvestTokens errors", async function() {
    await expectError("sale not ended", async () => {
      await this.sale.harvestTokens();
    });

    await advanceToTime(this.startTime + 30);
    await this.paymentToken
      .connect(this.signers[1])
      .transferAndCall(this.sale.address, parseUnits("100"), "0x");
    await this.sale.finalize();
    await advanceToTime(this.startTime + 91);

    await expectError("have you participated?", async () => {
      await this.sale.harvestTokens();
    });
  });

  it("withdrawToken", async function() {
    await this.offeringToken.transfer(this.sale.address, parseUnits("123"));
    const balanceBefore = await this.offeringToken.balanceOf(
      this.signer.address
    );
    await this.sale.withdrawToken(
      this.offeringToken.address,
      parseUnits("121")
    );
    const balanceAfter = await this.offeringToken.balanceOf(
      this.signer.address
    );
    expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("121"));
  });
});
