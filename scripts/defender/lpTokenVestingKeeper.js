const { Relayer } = require("defender-relay-client");
const { ethers } = require("ethers");
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require("defender-relay-client/lib/ethers");

const abi = [
  "function shouldRun() view returns (bool)",
  "function run()",
];

exports.handler = async function (event) {
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: "fast" });
  const contract = new ethers.Contract("0x5fB164A1f1F8cAF86D4bB362A1D24c007fAe92B5", abi, signer);
  if (await contract.shouldRun()) {
    console.log("working");
    const tx = await contract.run({gasLimit: 5000000});
    return { tx: tx.hash };
  } else {
    console.log("no work to do");
    return { tx: null };
  }
};