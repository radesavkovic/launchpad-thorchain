const { expect } = require("chai");
const { parseUnits, expectError, deployRegistry } = require("./utilities");

describe("DAO", function() {
  beforeEach(async function() {
    await deployRegistry();
    this.signers = await ethers.getSigners();
    this.signer = this.signers[0];

    this.MockToken = await ethers.getContractFactory("MockToken");
    this.token = await this.MockToken.deploy();
    await this.token.deployed();

    this.Voters = await ethers.getContractFactory("Voters");
    this.voters = await this.Voters.deploy(
      this.signer.address,
      this.token.address,
      this.token.address
    );
    await this.voters.deployed();
    await this.token.approve(this.voters.address, parseUnits("500"));
    await this.voters.lock(parseUnits("500"));

    this.DAO = await ethers.getContractFactory("DAO");
    this.dao = await this.DAO.deploy(this.voters.address, 1, 10, 100, 10);
    await this.dao.deployed();

    await this.voters.grantRole(
      "0x448f811bab0a96b12a5a67c73e96871dba861330a24a3040e1baeb42bb606d31", // snapshoter
      this.dao.address
    );
  });

  it("propose", async function() {
    const args = [
      "Title",
      "Description",
      1000,
      100,
      ["For", "Against"],
      [[], []]
    ];

    await expectError("actions length > 10", () =>
      this.dao.propose(
        "Title",
        "Description",
        1000,
        100,
        ["For", "Against"],
        [
          [
            "0xff",
            "0xff",
            "0xff",
            "0xff",
            "0xff",
            "0xff",
            "0xff",
            "0xff",
            "0xff",
            "0xff",
            "0xff"
          ],
          []
        ]
      )
    );

    await this.dao.propose(...args);
    const proposalsCount = await this.dao.proposalsCount();
    const proposal = await this.dao.proposal(proposalsCount);
    expect(proposal[0]).to.equal(1);
    expect(proposal[1]).to.equal(this.signer.address);
    expect(proposal[2]).to.equal("Title");
    expect(proposal[6]).to.equal(0);
    expect(proposal[7]).to.equal(false);
    const proposalDetails = await this.dao.proposalDetails(proposalsCount);
    expect(proposalDetails[0]).to.equal("Description");
    expect(proposalDetails[1]).to.equal(2);
    expect(proposalDetails[2]).to.equal(parseUnits("500"));
    expect(proposalDetails[3]).to.deep.equal(["For", "Against"]);
    expect(proposalDetails[4]).to.deep.equal([[], []]);
    expect(proposalDetails[5][0]).to.equal(0);
    expect(proposalDetails[5][1]).to.equal(0);

    await expectError("1 live proposal max", () => this.dao.propose(...args));
    await expectError("<balance", () =>
      this.dao
        .connect(this.signers[1])
        .propose(
          "Title",
          "Description",
          1000,
          100,
          ["For", "Against"],
          [[], []]
        )
    );
    await expectError("option len match", () =>
      this.dao.propose(
        "Title",
        "Description",
        1000,
        100,
        ["For", "Against"],
        [[]]
      )
    );
    await expectError("last option, no action", () =>
      this.dao.propose(
        "Title",
        "Description",
        1000,
        100,
        ["For", "Against"],
        [[], ["0xBEEF"]]
      )
    );
    await expectError("<voting time", () =>
      this.dao.propose(
        "Title",
        "Description",
        0,
        100,
        ["For", "Against"],
        [[], []]
      )
    );
    await expectError("<exec delay", () =>
      this.dao.propose(
        "Title",
        "Description",
        1000,
        0,
        ["For", "Against"],
        [[], []]
      )
    );
  });

  it("proposeCancel", async function() {
    await this.dao.propose(
      "Title",
      "Description",
      1000,
      100,
      ["For", "Against"],
      [[], []]
    );

    await ethers.provider.send("evm_increaseTime", [90000]);

    await this.dao.proposeCancel(1, "Cancel 1", "Because");
    const proposalsCount = await this.dao.proposalsCount();
    const proposal = await this.dao.proposal(proposalsCount);
    expect(proposal[0]).to.equal(2);
    expect(proposal[1]).to.equal(this.signer.address);
    expect(proposal[2]).to.equal("Cancel 1");
    expect(proposal[6]).to.equal(0);
    expect(proposal[7]).to.equal(false);
    const proposalDetails = await this.dao.proposalDetails(proposalsCount);
    const actionBytes = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint", "bytes"],
      [
        this.dao.address,
        0,
        this.dao.interface.encodeFunctionData("cancel", [1])
      ]
    );
    expect(proposalDetails[0]).to.equal("Because");
    expect(proposalDetails[1]).to.equal(3);
    expect(proposalDetails[2]).to.equal(parseUnits("500"));
    expect(proposalDetails[3]).to.deep.equal(["Cancel Proposal", "Do Nothing"]);
    expect(proposalDetails[4]).to.deep.equal([[actionBytes], []]);
    expect(proposalDetails[5][0]).to.equal(0);
    expect(proposalDetails[5][1]).to.equal(0);

    await this.dao.vote(proposalsCount, 0);

    await ethers.provider.send("evm_increaseTime", [100000]);

    await this.dao.execute(proposalsCount);

    const cancelledProposal = await this.dao.proposal(1);
    expect(cancelledProposal[7]).to.equal(true);
    await expectError("proposal cancelled", () => this.dao.execute(1));
  });

  it("vote", async function() {
    await this.dao.propose(
      "Title",
      "Description",
      1000,
      100,
      ["For", "Against"],
      [[], []]
    );
    await this.dao.vote(1, 1);
    await expectError("already voted", () => this.dao.vote(1, 1));
    const proposalDetails = await this.dao.proposalDetails(1);
    expect(proposalDetails[5][0]).to.equal(0);
    expect(proposalDetails[5][1]).to.equal(parseUnits("500"));
  });

  it("execute", async function() {
    await this.signer.sendTransaction({
      to: this.dao.address,
      value: parseUnits("10")
    });
    const action1Bytes = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint", "bytes"],
      [this.signer.address, parseUnits("1"), "0x"]
    );
    const action2Bytes = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint", "bytes"],
      [
        this.dao.address,
        0,
        this.dao.interface.encodeFunctionData("setMinBalanceToPropose", [
          parseUnits("99")
        ])
      ]
    );
    await this.dao.propose(
      "Title",
      "Description",
      1000,
      100,
      ["For", "Against"],
      [[action1Bytes, action2Bytes], []]
    );
    await this.dao.vote(1, 0);

    await ethers.provider.send("evm_increaseTime", [90000]);

    const balanceBefore = await this.signer.getBalance();
    await this.dao.execute(1);

    expect(await ethers.provider.getBalance(this.dao.address)).to.equal(
      parseUnits("9")
    );
    // >= 0.9, not 1 to account for gas paid
    expect(
      (await this.signer.getBalance()).gte(balanceBefore.add(parseUnits("0.9")))
    ).to.be.true;
    expect(await this.dao.minBalanceToPropose()).to.equal(parseUnits("99"));

    await expectError("already executed", () => this.dao.execute(1));
    await this.dao.propose(
      "Title",
      "Description",
      1000,
      100,
      ["For", "Against"],
      [[], []]
    );
    await expectError("not yet executable", () => this.dao.execute(2));
    await expectError("not a proposal", () => this.dao.execute(3));
    await ethers.provider.send("evm_increaseTime", [90000]);
    await expectError("not at quorum", () => this.dao.execute(2));
  });

  it("setMinBalanceToPropose", async function() {
    await expectError("!DAO", () => this.dao.setMinBalanceToPropose(0));
  });
});
