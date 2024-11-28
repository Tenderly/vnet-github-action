import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@tenderly/hardhat-tenderly";

import * as dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.27",
  networks: {
    tenderly_ci: {
      url: process.env.TENDERLY_ADMIN_RPC_URL,
      chainId: parseInt(process.env.TENDERLY_CHAIN_ID!)
    },
  },
  etherscan: {
    apiKey: {
      tenderly_ci: process.env.TENDERLY_ACCESS_KEY!
    },
    customChains: [
      {
        network: "tenderly_ci",
        chainId: parseInt(process.env.TENDERLY_CHAIN_ID!),
        urls: {
          apiURL: `${process.env.TENDERLY_ADMIN_RPC_URL}/verify/etherscan`,
          browserURL: process.env.TENDERLY_ADMIN_RPC_URL!
        }
      }
    ]
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT_NAME!,
    username: process.env.TENDERLY_ACCOUNT_NAME!,
    accessKey: process.env.TENDERLY_ACCESS_KEY!
  },
  sourcify: {
    enabled: false
  }
};

export default config;
