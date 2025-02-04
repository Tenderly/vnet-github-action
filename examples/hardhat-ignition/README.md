# Sample Hardhat Project

This project demonstrates a basic CI setup with Hardhat Ignition. Also explore the [Hardhat-ignition guide](https://docs.tenderly.co/virtual-testnets/ci-cd/github-actions-hardhat).

## Configure hardhat networks

For multi-chain deployments, extend `hardhat.config.ts` with all the networks you're deploying to.

> [!TIP] Add default values
> When testing, you will probably need only one chain. For this reason, add an empty string `""`  
> for network's `url` and `-1` for chainId when these variables aren't present.

```ts
{
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
}
```

## Configure deployment script(s)

Extend your `package.json` with separate deployment scripts for each network:

```json
{
  scripts: {
    "deploy:1": "yes | npx hardhat ignition deploy ./ignition/modules/CounterMainnet.ts --network tenderly_1",
    "deploy:8453": "yes | npx hardhat ignition deploy ./ignition/modules/CounterBase.ts --network tenderly_8453",
  }
}
```

> [!TIP] Pass `deployment-id` from action definition
> Hardhat-Ignition requires a deploument ID. For repeated deployments, provide unique `deployment-id` from the action definition.

## Extend HardhatUserConfig

To enable verification, the Hardhat config object must be extended with the following:
- `etherscan` object, enabling smart contract verification. Include `customChains` with `apiUrl` pointing to [Tenderly's verification URL](https://docs.tenderly.co/contract-verification/foundry#verification-url)
- `tenderly` object, with information about the user and project

```
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

```

## Configure the Github Action

Notes:
- You can run hardhat tests against Virtual TestNets (see the `test` step).
- When running deployment scripts, add the `--deployment-id` parameter. For multiple independent deployments, use the `$BUILD_SLUG` environment variable exposed by the github action.

```yaml
name: Hardhat CI/CD Multichain

on: [push, pull_request]
env:
  ## Needed available as env variables for hardhat.config.js
  TENDERLY_PROJECT_NAME: ${{ vars.TENDERLY_PROJECT_NAME }}
  TENDERLY_ACCOUNT_NAME: ${{ vars.TENDERLY_ACCOUNT_NAME }}
jobs:
 test:
   runs-on: ubuntu-latest
   steps:
     - uses: actions/checkout@v4

     - name: Setup Node.js
       uses: actions/setup-node@v4
       with:
         node-version: '20'
         cache: 'npm'

     - name: Setup Virtual TestNet
       uses:  tenderly/vnet-github-action@v1.0.14
       with:
         mode: CI    # pauses testnet after deployment
         access_key: ${{ secrets.TENDERLY_ACCESS_KEY }}
         project_name: ${{ vars.TENDERLY_PROJECT_NAME }}
         account_name: ${{ vars.TENDERLY_ACCOUNT_NAME }}
         testnet_name: "Staging"
         network_id: 1
         chain_id_prefix: 7357
         public_explorer: true
         verification_visibility: 'src'
         push_on_complete: true

     - name: Install dependencies
       run: npm install
       working-directory: examples/hardhat-ignition

     - name: Run Tests
       run: npm run test:1
       working-directory: examples/hardhat-ignition

  deploy:
   needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Setup Virtual TestNet
        uses:  tenderly/vnet-github-action@v1.0.14
        with:
          mode: CD
          access_key: ${{ secrets.TENDERLY_ACCESS_KEY }}
          project_name: ${{ vars.TENDERLY_PROJECT_NAME }}
          account_name: ${{ vars.TENDERLY_ACCOUNT_NAME }}
          testnet_name: "Staging"
          network_id: |
            1
            8453
          chain_id_prefix: ""
          public_explorer: true
          verification_visibility: 'src'
          push_on_complete: true

      - name: Install dependencies
        run: npm install
        working-directory: examples/hardhat-ignition

      - name: Deploy Contracts Mainnet
        run: npm run deploy:1 -- --deployment-id deploy-1-${BUILD_SLUG}
        working-directory: examples/hardhat-ignition

      - name: Deploy Contracts Base
        run: npm run deploy:8453 -- --deployment-id deploy-8453-${BUILD_SLUG}
        working-directory: examples/hardhat-ignition
```