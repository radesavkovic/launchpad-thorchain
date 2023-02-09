const hre = require("hardhat");

// const xruneContract = "0x0fe3ecd525d16fa09aa1ff177014de5304c835e2"; // ropsten
// const sushiRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // ropsten
const xruneContract = "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c"; // mainnet
const sushiRouter = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"; // mainnet

async function main() {
  const Contract = await hre.ethers.getContractFactory("LpTokenVesting");
  const args = [
    xruneContract, // token
    "0xa5f2211b9b8170f694421f2046281775e8468044", // offering token
    sushiRouter, // sushi router
    2592000, // vesting cliff (1 month)
    23328000, // vesting length (9 months)
    [
      "0x69539C1c678dFd26E626f109149b7cEBDd5E4768",
      "0xdD20057B8a4F9565cb871a244f04447bE5B03E08"
    ] // parties
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
