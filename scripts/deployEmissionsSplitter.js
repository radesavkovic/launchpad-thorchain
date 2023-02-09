const hre = require("hardhat");

// const xruneContract = "0x0fe3ecd525d16fa09aa1ff177014de5304c835e2"; // ropsten
const xruneContract = "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c"; // mainnet

async function main() {
  const Contract = await hre.ethers.getContractFactory("EmissionsSplitter");
  const args = [
    xruneContract, // token
    1630418400, // emissions start
    "0x5b1b8BdbcC534B17E9f8E03a3308172c7657F4a3", // dao
    "0xb90642fd1a7F39970C2643B57a71bC553F6EBDEd", // team
    "0x8f283547cA7B872F15d50861b1a676a301fC6d42", // investors
    "0xcC2D8Fca73F79A2d5643d448E16C6410D753Dec1" // ecosystem
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
