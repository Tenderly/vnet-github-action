require("@nomicfoundation/hardhat-toolbox");
require("@tenderly/hardhat-tenderly");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    vnet: {
      url: process.env.TENDERLY_ADMIN_RPC_URL,
      chainId: parseInt(process.env.TENDERLY_CHAIN_ID)
    }
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT_SLUG,
    username: process.env.TENDERLY_ACCOUNT_SLUG,
    accessKey: process.env.TENDERLY_ACCESS_KEY
  }
};