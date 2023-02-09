const hre = require("hardhat");

async function main() {
  const Contract = await hre.ethers.getContractFactory("TiersInfo");
  const args = ['0x817ba0ecafD58460bC215316a7831220BFF11C80'];
  const contract = await Contract.deploy(...args);
  await contract.deployed();
  console.log(contract.address, args);
  if (hre.network.name !== "hardhat") {
    await new Promise(resolve => setTimeout(resolve, 20000));
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: args,
    });
  }
  console.log("Contract deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
