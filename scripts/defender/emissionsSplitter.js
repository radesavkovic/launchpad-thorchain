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
  const contract = new ethers.Contract("0xEf62f575919799B1999F3Dc13f57018352428859", abi, signer);
  if (await contract.shouldRun()) {
    console.log("working");
    const tx = await contract.run();
    return { tx: tx.hash };
  } else {
    console.log("no work to do");
    return { tx: null };
  }
};