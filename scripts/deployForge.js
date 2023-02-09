const hre = require("hardhat");

async function main() {
  const signer = await ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory("ForgeV1");
  const args = [
    signer.address, // owner
    "0xAD921950386D6385221A9C3fd532d391288099BC", // unstake early wallet
    "0xe1e6b01ae86ad82b1f1b4eb413b219ac32e17bf6", // xrune
    "15",
    "1095",
    "600000000",
    "10000000"
  ];

  const contract = await upgrades.deployProxy(Contract, args);
  await contract.deployed();

  let contractAddress = await ethers.provider.getStorageAt(
    contract.address,
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
  );
  contractAddress = "0x" + contractAddress.slice(26);
  if (hre.network.name !== "hardhat") {
    await new Promise(resolve => setTimeout(resolve, 20000));
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: []
    });
  }
  console.log("Contract deployed to:", contract.address, contractAddress);
  // Use https://ropsten.etherscan.io/proxyContractChecker to finish verifying contract
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
