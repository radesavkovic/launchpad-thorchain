const { expect } = require("chai");
const {
  ADDRESS_ZERO,
  expectError,
  prepare,
  deploy,
  getBigNumber,
  currentTime,
  advanceTime
} = require("./utilities");

describe("XRUNE", function() {
  before(async function() {
    await prepare(this, ["XRUNE"]);
  });

  beforeEach(async function() {
    await deploy(this, [["xrune", this.XRUNE, [this.alice.getAddress()]]]);
  });

  it("mints 500M to deployer", async function() {
    expect(await this.xrune.balanceOf(this.alice.getAddress())).to.equal(
      getBigNumber("500000000")
    );
  });

  it("allows curve to be set by admin", async function() {
    await this.xrune.setCurve(512);
    expect(await this.xrune.curve()).to.equal(512);
  });

  it("disalows curve to be set by anybody", async function() {
    expectError("caller is not the owner", async () => {
      await this.xrune.connect(this.bob).setCurve(10);
    });
  });

  it("allows reserve to be set by admin", async function() {
    await this.xrune.setReserve(this.bob.getAddress());
    expect(await this.xrune.reserve()).to.equal(await this.bob.getAddress());
  });

  it("disalows reserve to be set by anybody", async function() {
    expectError("caller is not the owner", async () => {
      await this.xrune.connect(this.bob).setReserve(this.bob.getAddress());
    });
  });

  it("allows next era to be set by admin", async function() {
    const nextEra = (await currentTime()) + 60;
    await this.xrune.setNextEra(nextEra);
    expect(await this.xrune.nextEra()).to.equal(nextEra);
  });

  it("disalows next era to be set by anybody", async function() {
    expectError("caller is not the owner", async () => {
      await this.xrune.connect(this.bob).setNextEra(0);
    });
  });

  it("disalows next era that's in the past", async function() {
    expectError("needs to be in the future", async () => {
      await this.xrune.setNextEra(9001);
    });
  });

  it("calculates initial daily emission", async function() {
    expect(await this.xrune.dailyEmission()).to.equal(
      getBigNumber("488281.25")
    );
  });

  it("dailyEmit works when era pending", async function() {
    await this.xrune.setReserve(this.bob.getAddress());
    await this.xrune.toggleEmitting();
    await advanceTime(90000);
    await this.xrune.dailyEmit();
    const nextEra = await this.xrune.nextEra();
    const dailyEmit = await this.xrune.dailyEmission();
    const previous = await this.xrune.balanceOf(this.bob.getAddress());
    await advanceTime(parseInt(await this.xrune.ERA_SECONDS()));
    await expect(this.xrune.dailyEmit())
      .to.emit(this.xrune, "NewEra")
      .withArgs(nextEra, dailyEmit);
    expect(await this.xrune.balanceOf(this.bob.getAddress())).to.equal(
      previous.add(dailyEmit)
    );
  });

  it("dailyEmit wont emit when no reserve is set", async function() {
    await this.xrune.setReserve(ADDRESS_ZERO);
    await expect(this.xrune.dailyEmit()).not.to.emit(this.xrune, "NewEra");
  });

  it("dailyEmission calculates correctly", async function() {
    expect(await this.xrune.dailyEmission()).to.equal(
      getBigNumber("488281.25")
    );
  });
});
