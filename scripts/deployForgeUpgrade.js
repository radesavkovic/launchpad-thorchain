const hre = require("hardhat");

async function main() {
  const signer = await ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory("ForgeV1");
  const contract = await upgrades.upgradeProxy(
    "0x021c69fF2440C7d4cB47CbEDa25bE1Cb28a2ccbB",
    Contract
  );
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
