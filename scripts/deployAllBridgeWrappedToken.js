const hre = require("hardhat");

async function main() {
  const Contract = await hre.ethers.getContractFactory("WrappedToken");
  const args = [
    ethers.utils.formatBytes32String('ETH').slice(0, 2+8), // source
    ethers.utils.hexZeroPad('0x69fa0feE221AD11012BAb0FdB45d444D3D2Ce71c', 32), // source address
    18, // decimals
    'Thorstarter Token',
    'XRUNE',
  ];
  const contract = await Contract.deploy(...args);
  await contract.deployed();
  console.log(contract.address, args);
  await contract.transferOwnership('0xBBbD1BbB4f9b936C3604906D7592A644071dE884');
  console.log('ownership transfered');
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
