const { ethers, Wallet } = require("ethers");
require('dotenv').config();


const l1Provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI);
const l2Provider = new ethers.providers.JsonRpcProvider(process.env.ARB_GOERLI);

const l2Wallet = new Wallet(process.env.PK, l2Provider);


module.exports = {
    l1Provider,
    l2Wallet,
    l2Provider
};