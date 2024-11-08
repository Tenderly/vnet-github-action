require("@nomicfoundation/hardhat-toolbox");
require("@tenderly/hardhat-tenderly");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    tenderly_ci: {
      url: process.env.TENDERLY_ADMIN_RPC_URL,
      chainId: parseInt(process.env.TENDERLY_CHAIN_ID)
    }
  },
  etherscan: {
    apiKey: {
      tenderly_ci: process.env.TENDERLY_ACCESS_KEY
    },
    customChains: [
      {
        network: "tenderly_ci",
        chainId: process.env.TENDERLY_ACCESS_KEY,
        urls: {
          apiURL: process.env.TENDERLY_ADMIN_RPC_URL
        }
      }
    ]
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT_SLUG,
    username: process.env.TENDERLY_ACCOUNT_SLUG,
    accessKey: process.env.TENDERLY_ACCESS_KEY
  },
  sourcify: {
    enabled: false
  }
};