const { expect } = require("chai");
const { parseUnits, deployRegistry } = require("./utilities");

describe("EmissionsSplitter", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];
    this.EmissionsSplitter = await ethers.getContractFactory(
      "EmissionsSplitter"
    );
    this.EmissionsPrivateDispenser = await ethers.getContractFactory(
      "EmissionsPrivateDispenser"
    );
    this.MockToken = await ethers.getContractFactory("MockToken");

    this.token = await this.MockToken.deploy();
    await this.token.deployed();

    this.emissionsPrivateDispenser = await this.EmissionsPrivateDispenser.deploy(
      this.token.address,
      [this.signer.address],
      [parseUnits("1", 12)]
    );
    await this.emissionsPrivateDispenser.deployed();

    this.startTime = (await ethers.provider.getBlock("latest")).timestamp;
    this.emissionsSplitter = await this.EmissionsSplitter.deploy(
      this.token.address,
      this.startTime,
      this.signers[1].address,
      this.signers[2].address,
      this.emissionsPrivateDispenser.address,
      this.signers[3].address
    );
    await this.emissionsSplitter.deployed();

    await ethers.provider.send("evm_increaseTime", [2592000]);
  });

  it("shouldRun", async function() {
    expect(await this.emissionsSplitter.shouldRun()).to.equal(false);
    this.token.transfer(this.emissionsSplitter.address, parseUnits("1"));
    expect(await this.emissionsSplitter.shouldRun()).to.equal(true);
  });

  it("run", async function() {
    await this.token.transfer(
      this.emissionsSplitter.address,
      parseUnits("100000000")
    );
    await expect(this.emissionsSplitter.run())
      .to.emit(this.emissionsSplitter, "Split")
      .withArgs(
        parseUnits("100000000"),
        parseUnits("91534240.043235"),
        parseUnits("2712330.85992"),
        parseUnits("3698632.990845"),
        parseUnits("2054796.106")
      );
    expect(await this.token.balanceOf(this.signers[1].address)).to.equal(
      parseUnits("91534240.043235")
    );
    expect(await this.token.balanceOf(this.signers[2].address)).to.equal(
      parseUnits("2712330.85992")
    );
    expect(
      await this.token.balanceOf(this.emissionsPrivateDispenser.address)
    ).to.equal(parseUnits("3698632.990845"));
    expect(await this.token.balanceOf(this.signers[3].address)).to.equal(
      parseUnits("2054796.106")
    );

    // If we run right after, amounts to split will be much lower for team, investors & ecosystem as only little time / vesting passed
    // This tests that we keep track of how much has been sent to each party
    await this.token.transfer(
      this.emissionsSplitter.address,
      parseUnits("1000000")
    );
    await expect(this.emissionsSplitter.run())
      .to.emit(this.emissionsSplitter, "Split")
      .withArgs(
        parseUnits("1000000"),
        parseUnits("999993.46774"),
        parseUnits("2.09286"),
        parseUnits("2.8539"),
        parseUnits("1.5855")
      );
  });
});
