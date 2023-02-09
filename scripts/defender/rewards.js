const https = require("https");
const { Relayer } = require("defender-relay-client");
const { ethers } = require("ethers");
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require("defender-relay-client/lib/ethers");

const abi = [
  "function deposit(address vault, address asset, uint256 amount, string memo) payable",
];

const xrune = '0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c';

exports.handler = async function (event) {
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: "fast" });
  
  const aprd = 0.00325; //0.004921; // 500%
  const pools = await httpRequest("https://midgard.thorchain.info/v2/pools");
  const pool = pools.find((p) => p.asset === `ETH.XRUNE-${xrune}`.toUpperCase());
  
  const price = parseFloat(pool.assetPriceUSD);
  const total = ((parseInt(pool.assetDepth) * 2) / Math.pow(10, 8)) | 0;
  const rewards = (total * aprd) | 0;
  console.log(`rewards: ${rewards} XRUNE (${(rewards*price).toFixed(0)} USD) (price: ${price.toFixed(3)})`);
  
  const chains = await httpRequest(
    "https://midgard.thorchain.info/v2/thorchain/inbound_addresses"
  );
  const ethChain = chains.find((c) => c.chain === "ETH");
  console.log(`vault: ${ethChain.address}`);
  const contract = new ethers.Contract(ethChain.router, abi, signer);
  const tx = await contract.deposit(
    ethChain.address,
    xrune,
    ethers.utils.parseUnits(String(rewards)),
    `DONATE:ETH.XRUNE-${xrune}`.toUpperCase(),
    { gasLimit: 1000000 }
  );
  // await tx.wait();
  return { hash: tx.hash };
};

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        try {
          if (res.statusCode < 200 || 300 <= res.statusCode) {
            throw new Error(
              `Non 2xx status code: ${res.statusCode}: ${responseBody}`
            );
          }
          resolve(JSON.parse(responseBody));
        } catch (err) {
          reject(err);
        }
      });
      res.on("error", (err) => {
        reject(err);
      });
    });
    req.end();
  });
}