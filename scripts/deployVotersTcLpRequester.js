const hre = require("hardhat");

// const gasOracle = "0x4F89Aa0d2E97f77CC4595fa81e89984D63245331"; // ropsten
const gasOracle = "0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C"; // mainnet

async function main() {
  const signer = await ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory("VotersTcLpRequester");
  const args = [gasOracle];
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
