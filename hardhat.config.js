require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@tenderly/hardhat-tenderly");

const TENDERLY_RPC_URL = process.env.TENDERLY_ADMIN_RPC_URL;
const TENDERLY_ACCESS_KEY = process.env.TENDERLY_ACCESS_KEY;
const TENDERLY_PROJECT_SLUG = process.env.TENDERLY_PROJECT_SLUG || 'your-project-slug';
const TENDERLY_ACCOUNT_SLUG = process.env.TENDERLY_ACCOUNT_SLUG || 'your-account-slug';

module.exports = {
  solidity: "0.8.19",
  networks: {
    vnet: {
      url: TENDERLY_RPC_URL || "",
      chainId: 1,
    },
  },
  tenderly: {
    project: TENDERLY_PROJECT_SLUG,
    username: TENDERLY_ACCOUNT_SLUG,
    accessKey: TENDERLY_ACCESS_KEY,
    configPath: `${process.env.HOME}/.tenderly/config.yaml`
  },
};