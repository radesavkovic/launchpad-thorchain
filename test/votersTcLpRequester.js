const { expect } = require("chai");
const { parseUnits, expectError, deployRegistry } = require("./utilities");

describe("VotersTcLpRequester", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];
    this.VotersTcLpRequester = await ethers.getContractFactory(
      "VotersTcLpRequester"
    );
    this.ChainlinkOracleMock = await ethers.getContractFactory(
      "ChainlinkOracleMock"
    );

    this.chainlinkOracleMock = await this.ChainlinkOracleMock.deploy(
      parseUnits("78.234", 9)
    );
    await this.chainlinkOracleMock.deployed();

    this.votersTcLpRequester = await this.VotersTcLpRequester.deploy(
      this.chainlinkOracleMock.address
    );
    await this.votersTcLpRequester.deployed();
  });

  it("requestsSince", async function() {
    await this.votersTcLpRequester.request(this.signer.address, {
      value: parseUnits("0.05")
    });

    expect(await this.votersTcLpRequester.requestsSince(0)).to.deep.equal([
      this.signer.address.toLowerCase()
    ]);
    expect(await this.votersTcLpRequester.requestsSince(1)).to.deep.equal([]);
  });

  it("currentCost", async function() {
    expect(await this.votersTcLpRequester.currentCost()).to.equal(
      parseUnits("0.0469404")
    );
  });

  it("request", async function() {
    await this.votersTcLpRequester.request(this.signer.address, {
      value: parseUnits("0.0469404")
    });
    const index =
      (await this.votersTcLpRequester.requestCount()).toNumber() - 1;
    expect(await this.votersTcLpRequester.requests(index)).to.equal(
      this.signer.address.toLowerCase()
    );

    await expectError("must pay cost", async () =>
      this.votersTcLpRequester.request("0xdead", {
        value: parseUnits("0.0001")
      })
    );
  });

  it("withdraw", async function() {
    await this.votersTcLpRequester.request(this.signer.address, {
      value: parseUnits("0.05")
    });

    const balanceBefore = await this.signer.getBalance();
    await this.votersTcLpRequester.withdraw(parseUnits("0.045"));
    const balanceAfter = await this.signer.getBalance();
    expect(balanceAfter.sub(balanceBefore).gt(parseUnits("0.04"))).to.be.true;

    await expectError("not the owner", async () =>
      this.votersTcLpRequester.connect(this.signers[1]).withdraw("1")
    );
  });

  it("setLastRequest", async function() {
    expect(await this.votersTcLpRequester.lastRequest()).to.equal("0");
    await this.votersTcLpRequester.setLastRequest("123");
    expect(await this.votersTcLpRequester.lastRequest()).to.equal("123");

    await expectError("not the owner", async () =>
      this.votersTcLpRequester.connect(this.signers[1]).setLastRequest("123")
    );
  });
});
