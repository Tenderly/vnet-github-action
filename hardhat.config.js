require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const TENDERLY_RPC_URL = process.env.TENDERLY_PUBLIC_RPC_URL;

module.exports = {
  solidity: "0.8.18",
  networks: {
    vnet: {
      url: TENDERLY_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1337, // Custom chain ID for the Virtual TestNet
    },
  },
};