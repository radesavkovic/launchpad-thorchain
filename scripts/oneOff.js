const hre = require("hardhat");
const ethers = hre.ethers;
const parseUnits = ethers.utils.parseUnits;

async function main() {
  const signer = await ethers.getSigner();
  const gasPrice = (await signer.getGasPrice()).mul(250).div(100);

  // const Contract = await hre.ethers.getContractFactory("SaleFcfs");
  // const contract = Contract.attach(
  //   "0xd980a5fb418E2127573a001147B4EAdFE283c817"
  // );
  // await contract.configureTiers(
  //   "0x817ba0ecafD58460bC215316a7831220BFF11C80",
  //   parseUnits("141.8238547724"),
  //   [
  //     parseUnits("2500"),
  //     parseUnits("7500"),
  //     parseUnits("25000"),
  //     parseUnits("150000")
  //   ],
  //   [
  //     parseUnits("1", 8),
  //     parseUnits("1.5", 8),
  //     parseUnits("5", 8),
  //     parseUnits("10", 8)
  //   ],
  //   { gasPrice }
  // );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

/* deploy
  const Contract = await hre.ethers.getContractFactory("ERC20Mock");
  const args = ["USD Coin", "USDC", parseUnits("5000000")];
  const contract = await Contract.deploy(...args);
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
  */

/* replace
  const tx = await signer.sendTransaction({
    to: signer.address,
    value: parseUnits("0.001"),
    nonce: 463,
    //gasLimit: 2500000,
    gasPrice: parseUnits("200", "gwei")
  });
  console.log(tx.hash);
  await tx.wait();
  */

/* verify
  await hre.run("verify:verify", {
    address: "0xd6fe0135feA614Ddd0c83507fE5a0AD5c92672d2",
    constructorArguments: [
      "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c",
      1627789788,
      "0xda4f15016dcc70f048e647339d2065f91b9f658c",
      "0x0000000000000000000000000000000000000001",
      "0xDB0a151FFD93a5F8d29A241f480DABd696DE76BE",
      "0x0000000000000000000000000000000000000002"
    ]
  });
  */

/* approve
  const tokenAddress = "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c"; // mainnet
  const XRUNE = await hre.ethers.getContractFactory("XRUNE");
  const token = XRUNE.attach(tokenAddress);
  await token.approve(
    "0x87CF821bc517b6e54EEC96c324ABae82E8285E7C",
    ethers.utils.parseEther("100000"),
    { gasPrice }
  );
  console.log("Faucet approved for 100000 tokens");
  */
