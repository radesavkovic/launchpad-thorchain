const hre = require("hardhat");
const ethers = hre.ethers;

const {
  EIP2470_FACTORY_ABI,
  ERC1820_DEPLOYER_ADDRESS,
  ERC1820_REGISTRY_ADDRESS,
  ERC1820_REGISTRY_DEPLOY_TX
} = require("../test/utilities");

async function main() {
  if ((await ethers.provider.getCode(ERC1820_REGISTRY_ADDRESS)).length <= 2) {
    await (await ethers.getSigner()).sendTransaction({
      to: ERC1820_DEPLOYER_ADDRESS,
      value: ethers.utils.parseEther("0.8")
    });
    await ethers.provider.send("eth_sendRawTransaction", [
      ERC1820_REGISTRY_DEPLOY_TX
    ]);
  }

  const Token = await hre.ethers.getContractFactory("XRUNE");
  const signer = await hre.ethers.getSigner();
  const factory = new ethers.Contract(
    "0xce0042B868300000d44A59004Da54A005ffdcf9f",
    EIP2470_FACTORY_ABI,
    signer
  );
  const salt = ethers.utils.id("2");
  const param = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [await signer.getAddress()]
  );
  const bytecode = `${Token.bytecode}${param.slice(2)}`;
  const result = await (
    await factory.deploy(bytecode, salt, { gasLimit: 5000000 })
  ).wait();
  const tokenAddress = create2Address(bytecode, salt);
  const token = Token.attach(tokenAddress);
  console.log("Token deployed to:", tokenAddress);

  const faucet = await deploy("Faucet", [
    tokenAddress,
    "0xe0a63488e677151844e70623533c22007dc57c9e" // thorchain router
  ]);
  await token.approve(faucet.address, ethers.utils.parseEther("100000"));
  const staking = await deploy("Staking", [
    tokenAddress,
    await signer.getAddress(),
    ethers.utils.parseEther("50")
  ]);
  await staking.add(100, tokenAddress);
  await token.approve(staking.address, ethers.utils.parseEther("1000000"));
}

async function deploy(name, args) {
  const signer = await hre.ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory(name);
  const contract = await Contract.deploy.apply(
    Contract,
    args.concat([{ gasLimit: 5000000 }])
  );
  await contract.deployed();
  console.log(name + " deployed to:", contract.address);
  return contract;
}

function create2Address(bytecode, salt) {
  const factoryAddress = "0xce0042B868300000d44A59004Da54A005ffdcf9f";
  return `0x${ethers.utils
    .keccak256(
      `0x${["ff", factoryAddress, salt, ethers.utils.keccak256(bytecode)]
        .map(x => x.replace(/0x/, ""))
        .join("")}`
    )
    .slice(-40)}`.toLowerCase();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
