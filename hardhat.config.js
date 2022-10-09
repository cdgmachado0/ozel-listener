require("@nomiclabs/hardhat-waffle");
require('dotenv').config();
/** @type import('hardhat/config').HardhatUserConfig */


module.exports = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: process.env.GOERLI,
      accounts: [process.env.PK]
    }
  }
};
