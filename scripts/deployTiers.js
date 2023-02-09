const hre = require("hardhat");

async function main() {
  const signer = await ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory("TiersV1");
  const args = [
    signer.address, // owner
    "0x29965c56D54e82EbC232E554F1218D881f89c904", // dao
    "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c", // reward/xrune token
    "0xEBCD3922A199cd1358277C6458439C13A93531eD", // voters token
  ];

  const contract = await upgrades.deployProxy(Contract, args);
  await contract.deployed();

  let contractAddress = await ethers.provider.getStorageAt(contract.address, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
  contractAddress = '0x' + contractAddress.slice(26);
  if (hre.network.name !== "hardhat") {
    await new Promise(resolve => setTimeout(resolve, 20000));
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
  }
  console.log("Contract deployed to:", contract.address, contractAddress);
  // Use https://ropsten.etherscan.io/proxyContractChecker to finish verifying contract
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
