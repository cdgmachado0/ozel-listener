require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('dotenv').config();


module.exports = { 
  solidity: "0.8.17",
  networks: {
    mainnet: {
      url: process.env.MAINNET,
      accounts: [process.env.PK]
    }
  }
};
