const hre = require("hardhat");
const ethers = hre.ethers;
const parseUnits = ethers.utils.parseUnits;

async function main() {
  const signer = await ethers.getSigner();
  const gasPrice = (await signer.getGasPrice()).mul(2);
  const votersAddress = "0xEBCD3922A199cd1358277C6458439C13A93531eD"; // mainnet
  const Contract = await hre.ethers.getContractFactory("Voters");
  const contract = Contract.attach(votersAddress);
  //await contract.snapshot({ gasPrice });
  console.log("Snapshot ID:", (await contract.currentSnapshotId()).toNumber());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
