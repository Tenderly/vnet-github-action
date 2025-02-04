import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@tenderly/hardhat-tenderly';

import * as dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.27',
  networks: {
    tenderly_1: {
      url: process.env.TENDERLY_ADMIN_RPC_URL_1 || "",
      chainId: parseInt(process.env.TENDERLY_CHAIN_ID_1 || "-1"),
    },
    tenderly_8453: {
      url: process.env.TENDERLY_ADMIN_RPC_URL_8453 || "",
      chainId: parseInt(process.env.TENDERLY_CHAIN_ID_8453 || "-1"),
    },
  },
  etherscan: {
    apiKey: {
      tenderly_1: process.env.TENDERLY_ACCESS_KEY!,
      tenderly_8453: process.env.TENDERLY_ACCESS_KEY!,
    },
    customChains: [
      {
        network: 'tenderly_ci',
        chainId: parseInt(process.env.TENDERLY_CHAIN_ID!),
        urls: {
          apiURL: `${process.env.TENDERLY_ADMIN_RPC_URL}/verify/etherscan`,
          browserURL: process.env.TENDERLY_ADMIN_RPC_URL!,
        },
      },
    ],
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT_NAME!,
    username: process.env.TENDERLY_ACCOUNT_NAME!,
    accessKey: process.env.TENDERLY_ACCESS_KEY!,
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
