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
  const salt = ethers.utils.id("1");
  const param = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [await signer.getAddress()]
  );
  const bytecode = `${Token.bytecode}${param.slice(2)}`;
  const result = await (
    await factory.deploy(bytecode, salt, { gasLimit: 5000000 })
  ).wait();
  console.log("Token deployed to:", create2Address(bytecode, salt));
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
