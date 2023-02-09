const hre = require("hardhat");

const parseUnits = ethers.utils.parseUnits;

async function main() {
  const signer = await ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory("TokenPriceHelper");
  const args = [
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // weth9
    "0x6b175474e89094c44da98b954eedeac495271d0f", // dai
    "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac", // factory
  ];
  /* mainnet
  const args = [
    "0xc778417e063141139fce010982780140aa0cd5ab", // weth9
    "0xc2118d4d90b274016cb7a54c03ef52e6c537d957", // dai
    "0xc35dadb65012ec5796536bd9864ed8773abc74c4", // factory
  ];
  */

  const contract = await Contract.deploy(...args, {
    gasPrice: ethers.utils.parseUnits('150', 'gwei'),
  });
  await contract.deployed();
  console.log(args);
  if (hre.network.name !== "hardhat") {
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
