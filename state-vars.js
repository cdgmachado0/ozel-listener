const { ethers, Wallet } = require("ethers");
require('dotenv').config();


const network = 'goerli';
const ops = {
    gasLimit: ethers.BigNumber.from('5000000'),
    gasPrice: ethers.BigNumber.from('40134698068')
};

const l1ProviderTestnet = new ethers.providers.JsonRpcProvider(process.env.GOERLI);
const l2ProviderTestnet = new ethers.providers.JsonRpcProvider(process.env.ARB_GOERLI);

const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);


module.exports = {
    l1ProviderTestnet,
    network,
    ops,
    l2Wallet
};