const https = require('https');
const { Relayer } = require("defender-relay-client");
const { ethers } = require("ethers");
const { DefenderRelaySigner, DefenderRelayProvider } = require("defender-relay-client/lib/ethers");

const parseUnits = ethers.utils.parseUnits;
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

const abi = [
  "function lastRequest() view returns (uint256)",
  "function requestCount() view returns (uint256)",
  "function requestsSince(uint256 index) view returns (bytes[])",
  "function requests(uint256 index) view returns (bytes)",
  "function setLastRequest(uint256 index)",
];
const abiVoters = [
  "function userInfo(address user) view returns (uint256, uint256, uint256, uint256, uint256, uint256, address)",
  "function historicalTcLpsList(uint256 page, uint256 limit) view returns (address[])",
  "function updateTclp(address[] users, uint256[] amounts, uint256[] values)"
];

const poolName = 'ETH.XRUNE-0X69FA0FEE221AD11012BAB0FDB45D444D3D2CE71C';
const apiUrl = 'https://midgard.thorchain.info/v2';

async function fetchUserUnits(address) {
  const response = await httpRequest(apiUrl+'/member/'+address);
  const userPool = response.pools.find(p => p.pool === poolName);
  if (userPool && userPool.liquidityUnits !== "0") {
    return parseUnits(userPool.liquidityUnits, 18 - 8);
  }
  const memberPools = await httpRequest('https://multichain-asgard-consumer-api.vercel.app/api/v3/member/poollist?address=' + address);
  const memberPool = memberPools.find((p) => p.pool === poolName);
  if (memberPool && memberPool.poolunits !== "0") {
    return parseUnits(memberPool.poolunits, 18 - 8);
  }
  return parseUnits('0');
}

exports.handler = async function (event) {
  const xrunePool = await httpRequest(apiUrl + '/pool/' + poolName);
  const users = [];
  const amounts = [];
  const values = [];
  
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: "fast" });
  const voters = new ethers.Contract("0xEBCD3922A199cd1358277C6458439C13A93531eD", abiVoters, signer);
  const contract = new ethers.Contract("0x3fe9995dAEAe2510C1984E8D211d5f4480b26727", abi, signer);
  const lastRequest = await contract.lastRequest();
  const requestCount = await contract.requestCount();
  //const newRequests = await contract.requestsSince(lastRequest);

  for (let i = lastRequest; i < requestCount; i++) {
    const address = await contract.requests(i);
    try {
      const userUnits = await fetchUserUnits(address);
      if (userUnits.gt(0)) {
        const poolUnits = parseUnits(xrunePool.units, 18 - 8);
        const poolAsset = parseUnits(xrunePool.assetDepth, 18 - 8).mul(2);
        values.push(userUnits.mul(poolAsset).div(poolUnits));
        users.push(address);
        amounts.push(userUnits);
        console.log('added', address, ethers.utils.formatUnits(values[values.length-1]));
      } else {
        console.log('no lp for address:', address);
      }
    } catch (err) {
      console.log("add error:", address, err);
    }
  }
  
  // Fetch historical pool members
  const result = await httpRequest('https://thorstarter-xrune-liquidity.herokuapp.com/get-all');
  const addressesToUnits = result.units;
  const addressesToUnitsVoters = result.voters;
  const addresses = Object.keys(addressesToUnits);

  // Update historical LPs with a balance of zero if their Voters value is > 0
  for (let address of addresses) {
    try {
      // If we're already updating their value, they must still be an LP
      if (users.find((a) => a === address)) continue;
  
      // If their `lockedTcLpAmount` is already 0, no need to set it again
      const userUnits = parseUnits(addressesToUnits[address], 18 - 8);
      const userUnitsVoters = parseUnits(addressesToUnitsVoters[address], 0);
      if (userUnitsVoters.eq(0)) continue;
      
      // Check if their current liquidity units changed
      if (userUnits.gte(userUnitsVoters)) continue;
      
      users.push(address);
      amounts.push(0);
      values.push(0);
      console.log("zeroing:", address, ethers.utils.formatUnits(userUnitsVoters));
    } catch (err) {
      console.log("zero error:", address, err);
    }
  }
  
  console.log(lastRequest.toString(), requestCount.toString(), addresses.length, users, values.map(v => ethers.utils.formatUnits(v)));
  
  // Call updateTclp's if needed
  if (users.length > 0) {
    const tx0 = await voters.updateTclp(users, amounts, values, {gasLimit: 10000000});
    console.log('updateTcLp hash:', tx0.hash);
  }
  
  // If we actually processed requests, update last index
  if (lastRequest.toString() != requestCount.toString()) {
    const tx1 = await contract.setLastRequest(requestCount, {gasLimit: 250000});
    console.log('setLastRequest hash:', tx1.hash);
  }
  
  return { lastRequest, requestCount, updates: users.length };
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