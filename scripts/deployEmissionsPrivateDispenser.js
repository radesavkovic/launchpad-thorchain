const hre = require("hardhat");

const parseUnits = ethers.utils.parseUnits;
const formatUnits = ethers.utils.formatUnits;

// const xruneContract = "0x0fe3ecd525d16fa09aa1ff177014de5304c835e2"; // ropsten
const xruneContract = "0x69fa0fee221ad11012bab0fdb45d444d3d2ce71c"; // mainnet

const investors = [
  {
    address: "0x997fb1A5a5c9983A2ffEB9453E719975A2583Dc8",
    percent: "133333333333"
  },
  {
    address: "0x34Efe0D4661D52AA79cd2Cc1a7017E8B1309c8C3",
    percent: "33333333333"
  },
  {
    address: "0xa8683E7d45cA9E4746b1C7b9Ab4457E6128aF6ab",
    percent: "200000000000"
  },
  {
    address: "0x2a645c2794B3791b657126f2108D11E0A863E142",
    percent: "83333333333"
  },
  {
    address: "0x35B56618Aad07Af51A3Fb4b80cAFEC6B1175B886",
    percent: "83333333333"
  },
  {
    address: "0x43436C54D4d1b5c3bef23b58176b922bCB73fb9A",
    percent: "13333333333"
  },
  {
    address: "0x91f9FDf8e27755aC0bb728aD501742abf57e922D",
    percent: "33333333333"
  },
  {
    address: "0x07FFFed18d42472d009AD1B3DBb2e894F19EBc56",
    percent: "26666666666"
  },
  {
    address: "0x10a63354fEf491942fDCbDB2c1Ad042881A14B26",
    percent: "50000000000"
  },
  {
    address: "0x3b1E215FE1138aA9034b5E6De39892e45ac05176",
    percent: "30666666666"
  },
  {
    address: "0x471903799A45c6da3eC2a3a6fFAbA20AAeC9e973",
    percent: "30666666666"
  },
  {
    address: "0xa4e5d572ba7b92bf8f8a06574770afb60c603e00",
    percent: "22000000000"
  },
  {
    address: "0x40A392A72F08520c43d12774cb46e3BFcE814E4b",
    percent: "16666666666"
  },
  {
    address: "0xA2dCB52F5cF34a84A2eBFb7D937f7051ae4C697B",
    percent: "16666666666"
  },
  {
    address: "0x04Ddf96a61C4C44731f04Df4E963F61CFE3c9c6d",
    percent: "4000000000"
  },
  {
    address: "0x3cA2BF960C4A0F8217988Dc6EA415aEA09C883ad",
    percent: "8333333333"
  },
  {
    address: "0xC523433AC1Cc396fA58698739b3B0531Fe6C4268",
    percent: "20000000000"
  },
  {
    address: "0xB3C7C41dC82DC19391424B2EEf6F301D20Ca18CC",
    percent: "6666666666"
  },
  {
    address: "0xf01D14cC69B7217FB4CAC7e28Be81D945E28Fb4a",
    percent: "25666666666"
  },
  {
    address: "0x6e4116462a0abE7A5e75dD66e44A1cBB6b2006F1",
    percent: "1000000000"
  },
  {
    address: "0x367d36478f19395f920cf84fa46aa94d365f5253",
    percent: "1333333333"
  },
  {
    address: "0x52E7bdE89Fcbd1e1C656Db1C08DdE45D82447e25",
    percent: "2666666666"
  },
  {
    address: "0xeb1eF2FB8bFF1Da1CE36babAFA28ee2d1C526b66",
    percent: "1666666666"
  },
  {
    address: "0xF76dbc5d9A7465EcEc49700054bF27f88cf9ad05",
    percent: "1666666666"
  },
  {
    address: "0xbcd4cb80ba69376e10082427d6b50a181abcd307",
    percent: "1333333333"
  },
  {
    address: "0x145fFa5A63efb3077e48058B90Ac5875B2383042",
    percent: "3333333333"
  },
  {
    address: "0xc84096ee48090Fef832D0A77082385ea0EA2993D",
    percent: "4000000000"
  },
  {
    address: "0x6ae009d55f095099d6a789278ee7c001e7d0e51e",
    percent: "5000000000"
  },
  {
    address: "0x52611c224e44867ca611cfa0d05535d7ba07dc55",
    percent: "2666666666"
  },
  {
    address: "0x9D61B621Ed6cA279EB7f3f2106352117fE9DaDD2",
    percent: "10000000000"
  },
  {
    address: "0x3Bc162cEe9ef4e01Dfc641f5Ea77Ab7B06e5B501",
    percent: "23333333333"
  },
  {
    address: "0x78Bf8b271510E949ae4479bEd90c0c9a17cf020b",
    percent: "23333333333"
  },
  {
    address: "0xf1a785d140b102234315b1f837C5C15853eE8386",
    percent: "20000000000"
  },
  {
    address: "0xe139aB520c71C6dD7dF0af0015c2773002742C0c",
    percent: "13333333333"
  },
  {
    address: "0x605404298eCa4Eb22ac38A781C7299194be91eac",
    percent: "23333333333"
  },
  {
    address: "0xCb1F39532dd59a903d31500E74A879d9dC283b6F",
    percent: "3333333333"
  },
  {
    address: "0x3489DBBf6d7ebEdeB503C71ae066CF5DfA54b8a9",
    percent: "6666666666"
  },
  {
    address: "0xD09545A4446f5E2F4749a49c7C32B3Ce42a5Fe37",
    percent: "5000000000"
  },
  {
    address: "0xDD3ebE16b9E5155dA25F86f301D4D97bd87a8A56",
    percent: "5000000000"
  },
  {
    address: "0x2fd6fdB35Afc8B42f744146eC6b114891cE490c3",
    percent: "666666666"
  },
  {
    address: "0x482c7f6217292d40452b68897c8265d49f20a511",
    percent: "3333333333"
  },
  {
    address: "0x000000000000000000000000000000000000dead",
    percent: "14"
  }
];

async function main() {
  const signer = await ethers.getSigner();
  const Contract = await hre.ethers.getContractFactory(
    "EmissionsPrivateDispenser"
  );
  const args = [
    xruneContract, // token
    investors.map(i => i.address), // investor addresses
    investors.map(i => parseUnits(i.percent, 0)) // investor percentages (1e12 = 100%)
  ];
  const contract = await Contract.deploy(...args, {
    gasLimit: 5000000
    //gasPrice: parseUnits("100", "gwei"),
  });
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
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
