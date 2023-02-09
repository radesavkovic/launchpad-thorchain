const hre = require("hardhat");

// const xruneContract = "0x0fe3ecd525d16fa09aa1ff177014de5304c835e2"; // ropsten
const xruneContract = "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c"; // mainnet
// const sushiRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // ropsten
const sushiRouter = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"; // mainnet

async function main() {
  const signer = await ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory("LpTokenVestingKeeper");
  const args = [
    "0x45cd79fA4faD4a2DfC2294B0315d45e41D8e9601", // VotersInvestmentDispenser
    sushiRouter, // sushi router
    xruneContract, // token
    "0x5b1b8BdbcC534B17E9f8E03a3308172c7657F4a3", // dao
    "0xcC2D8Fca73F79A2d5643d448E16C6410D753Dec1", // grants
    signer.address // owner
  ];
  const contract = await Contract.deploy(...args, {
    //gasLimit: 5000000,
    //gasPrice: parseUnits("100", "gwei"),
  });
  await contract.deployed();
  console.log(contract.address, args);
  if (hre.network.name !== "hardhat") {
    await new Promise(resolve => setTimeout(resolve, 20000));
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: args
    });
  }
  console.log("Contract deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
