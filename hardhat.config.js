require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@tenderly/hardhat-tenderly");

const TENDERLY_RPC_URL = process.env.TENDERLY_ADMIN_RPC_URL;
const TENDERLY_ACCESS_KEY = process.env.TENDERLY_ACCESS_KEY;

console.log("TENDERLY_RPC_URL:", TENDERLY_RPC_URL);
console.log("TENDERLY_ACCESS_KEY:", TENDERLY_ACCESS_KEY ? "Set" : "Not set");

module.exports = {
  solidity: "0.8.19",
  networks: {
    vnet: {
      url: TENDERLY_RPC_URL || "",
      chainId: 1,
    },
  },
  tenderly: {
    project: "vnets",
    username: "dzeka",
    accessKey: TENDERLY_ACCESS_KEY,
    configPath: `${process.env.HOME}/.tenderly/config.yaml`
  },
};