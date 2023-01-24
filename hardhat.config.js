require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('dotenv').config();


module.exports = { 
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: process.env.GOERLI,
      accounts: [process.env.PK]
    }
  }
};
