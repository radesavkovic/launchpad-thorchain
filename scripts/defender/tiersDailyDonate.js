const { Relayer } = require("defender-relay-client");
const { ethers } = require("ethers");
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require("defender-relay-client/lib/ethers");

const abi = [
  "function totalAmount() view returns (uint256)",
  "function donate(uint256)",
];

exports.handler = async function (event) {
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: "fast" });
  const contract = new ethers.Contract("0x817ba0ecafD58460bC215316a7831220BFF11C80", abi, signer);
  const totalAmount = await contract.totalAmount();
  const amount = totalAmount.mul('00026115').div('100000000');
  const tx = await contract.donate(totalAmount.mul('00026115').div('100000000'));
  return { tx: tx.hash, amount: ethers.utils.formatUnits(amount) };
};