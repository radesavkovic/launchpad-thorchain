const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const tokenAddress = "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c"; 
  const sushiPairAddress = "0x95cfa1f48fad82232772d3b1415ad4393517f3b5";

  const signer = await hre.ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory("SushiRewarder");
  const contract = await Contract.deploy(tokenAddress, sushiPairAddress);

  await contract.deployed();
  console.log("SushiRewarder deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
