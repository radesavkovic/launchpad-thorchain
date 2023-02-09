const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const tokenAddress = "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c"; // mainnet
  //const thorchainRouter = "0xe0a63488e677151844e70623533c22007dc57c9e"; // ropsten
  const thorchainRouter = "0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B"; // mainnet

  const signer = await hre.ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory("Faucet");
  const contract = await Contract.deploy(tokenAddress, thorchainRouter);

  await contract.deployed();
  console.log("Faucet deployed to:", contract.address);

  const XRUNE = await hre.ethers.getContractFactory("XRUNE");
  const token = XRUNE.attach(tokenAddress);
  await token.approve(contract.address, ethers.utils.parseEther("100000"));
  console.log("Faucet approved for 100000 tokens");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
