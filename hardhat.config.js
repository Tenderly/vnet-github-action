require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const tenderly = require("@tenderly/hardhat-tenderly");

const TENDERLY_RPC_URL = process.env.TENDERLY_PUBLIC_RPC_URL;

module.exports = {
  solidity: "0.8.19",
  networks: {
    vnet: {
      url: TENDERLY_RPC_URL || "",
      chainId: 1337, // Custom chain ID for the Virtual TestNet
    },
  },
  tenderly: {
    project: "vnets",
    username: "dzeka",
  },
};