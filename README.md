# Tenderly Virtual TestNet GitHub Action

[![GitHub release](https://img.shields.io/github/release/Tenderly/vnet-github-action.svg?style=flat-square)](https://github.com/Tenderly/vnet-github-action/releases/latest)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-tenderly--virtual--testnet-blue?logo=github&style=flat-square)](https://github.com/marketplace/actions/tenderly-virtual-testnet)

The `Tenderly/vnet-github-action` automates Virtual TestNet provisioning for smart contract CI/CD pipelines. This action creates a new Virtual TestNet from your configuration and exposes its RPC URLs through environment variables, enabling automated testing and staging environments for your protocols.

This action enables:

- **Continuous Integration**: Run your Hardhat tests against a forked network and use Tenderly debugger and Simulator to fix issues
- **Protocol Staging**: Deploy and stage your protocols in an isolated, mainnet-like environment
- **Contract Staging**: Use dedicated Virtual TestNets as staging environments for contract development
- **Block Explorer Access**: Built-in block explorer for verifying staged contracts
- **State Synchronization**: Optional state sync between your staging environment and production networks

## Quick Start

Basic Virtual TestNet setup for staging environments with explorer and state sync. This example shows how to fork Ethereum mainnet with a custom chain ID, enable the block explorer for contract verification, and keep the testnet state in sync with mainnet:

```yaml
name: Smart Contract CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Virtual TestNet
        uses: Tenderly/vnet-github-action@v1.0.6
        with:
          access_key: ${{ secrets.TENDERLY_ACCESS_KEY }}
          project_name: ${{ vars.TENDERLY_PROJECT_NAME }}
          account_name: ${{ vars.TENDERLY_ACCOUNT_NAME }}
          testnet_name: 'CI Test Network'
          network_id: 1
          chain_id: 73571  # Recommended: prefix with 7357 for unique identification to avoid transaction replay attacks
          explorer_enabled: true 
          explorer_verification_type: 'src'  # Options: 'abi', 'src', 'bytecode'
          sync_state_enabled: true 
```

## Integration Examples

The following examples demonstrate how to integrate Tenderly Virtual TestNet into your CI/CD pipeline using popular development frameworks. Each example includes both testing and staging deployment stages, with tests running on ephemeral environments and deployments targeting a persistent staging testnet.

### Hardhat Pipeline

This sample configuration will:
- `test` contracts by deploying them and sending test transactions to an ephemeral Virtual TestNet
- `deploy` contracts to the staging Virtual TestNet

```yaml
name: Hardhat Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Virtual TestNet
        uses: Tenderly/vnet-github-action@v1.0.6
        with:
          access_key: ${{ secrets.TENDERLY_ACCESS_KEY }}
          project_name: ${{ vars.TENDERLY_PROJECT_NAME }}
          account_name: ${{ vars.TENDERLY_ACCOUNT_NAME }}
          network_id: 1
          chain_id: 73571
          explorer_enabled: true
      
      - name: Install dependencies
        run: npm install
      
      - name: Run Tests
        run: npx hardhat test --network tenderly_ci

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Virtual TestNet
        uses: Tenderly/vnet-github-action@v1.0.6
        with:
          access_key: ${{ secrets.TENDERLY_ACCESS_KEY }}
          project_name: ${{ vars.TENDERLY_PROJECT_NAME }}
          account_name: ${{ vars.TENDERLY_ACCOUNT_NAME }}
          network_id: 1
          chain_id: 73571
          explorer_enabled: true
          
      - name: Deploy Contracts
        run: npx hardhat run scripts/deploy.js --network tenderly_ci
```

> [!TIP] Extend your hardhat config
> Add the following to `hardhat.config.js`:
> ```
>   networks: {
>    tenderly_ci: {
>      url: process.env.TENDERLY_ADMIN_RPC_URL,
>      chainId: parseInt(process.env.TENDERLY_CHAIN_ID)
>    }
>  },
>  tenderly: {
>    project: process.env.TENDERLY_PROJECT_NAME,
>    username: process.env.TENDERLY_ACCOUNT_NAME,
>    accessKey: process.env.TENDERLY_ACCESS_KEY
>  }
> ```

### Foundry Pipeline

This pipeline runs tests and deploys verified contracts to a Virtual TestNet. Virtual TestNets provide a persistent environment, making them ideal for staging and integration testing.

```yaml
name: Foundry Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      
      - name: Build and Test
        run: |
          forge build
          forge test -vvv

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Virtual TestNet
        uses: Tenderly/vnet-github-action@v1.0.6
        with:
          access_key: ${{ secrets.TENDERLY_ACCESS_KEY }}
          project_name: ${{ vars.TENDERLY_PROJECT_NAME }}
          account_name: ${{ vars.TENDERLY_ACCOUNT_NAME }}
          network_id: 1
          chain_id: 73571
          explorer_enabled: true
          
      - name: Deploy Contracts
        env:
          FOUNDRY_ETH_RPC_URL: ${{ env.TENDERLY_PUBLIC_RPC_URL }}
          FOUNDRY_VERIFIER_URL: ${{ env.TENDERLY_FOUNDRY_VERIFICATION_URL }}
        run: |
          forge script script/Deploy.s.sol \
            --rpc-url $FOUNDRY_ETH_RPC_URL \
            --verifier-url $FOUNDRY_VERIFIER_URL \
            --slow \
            --broadcast \
            --verify
```

## Inputs

| Name                         | Required | Default              | Description                                                                   |
| ---------------------------- | -------- | -------------------- | ----------------------------------------------------------------------------- |
| `access_key`                 | Yes      | -                    | Tenderly API Access Key                                                       |
| `project_name`               | Yes      | -                    | Tenderly Project Name                                                         |
| `account_name`               | Yes      | -                    | Tenderly Account Name                                                         |
| `testnet_name`               | Yes      | 'CI Virtual TestNet' | Display name for the Virtual TestNet                                          |
| `network_id`                 | Yes      | 1                    | Network ID to fork (e.g., 1 for Ethereum mainnet) - integer                   |
| `chain_id`                   | No       | -                    | Custom chain ID for Virtual TestNet (Recommended: prefix with 7357) - integer |
| `block_number`               | Yes      | 'latest'             | Block number to fork from (must be a hex string, e.g., '0x1234567')           |
| `explorer_enabled`           | No       | false                | Enable block explorer for the Virtual TestNet                                 |
| `explorer_verification_type` | No       | 'bytecode'           | Contract verification type ('abi', 'src', or 'bytecode')                      |
| `sync_state_enabled`         | No       | false                | Enable state synchronization with forked network                              |

## Outputs

The action exports several environment variables:

| Variable                            | Description                                |
| ----------------------------------- | ------------------------------------------ |
| `TENDERLY_TESTNET_ID`               | The ID of the created Virtual TestNet      |
| `TENDERLY_ADMIN_RPC_URL`            | Admin RPC endpoint URL                     |
| `TENDERLY_PUBLIC_RPC_URL`           | Public RPC endpoint URL                    |
| `TENDERLY_FOUNDRY_VERIFICATION_URL` | URL for Foundry contract verification      |
| `TENDERLY_EXPLORER_URL`             | Block explorer URL for the Virtual TestNet |

## Advanced Configuration

Advanced configuration examples demonstrate how to extend the basic Virtual TestNet setup for more complex scenarios, such as multi-network testing and custom chain configurations.

### Multi-Network Testing
Use matrix strategy to test your contracts across multiple networks in parallel. This is particularly useful for protocols that deploy across multiple chains and need to ensure consistent behavior.

```yaml
jobs:
  test:
    strategy:
      matrix:
        network: ['1', '137', '42161']  # Ethereum, Polygon, Arbitrum
    steps:
      - uses: Tenderly/vnet-github-action@v1.0.6
        with:
          network_id: ${{ matrix.network }}
          chain_id: ${{ format('7357{0}', matrix.network) }}
```

## Debugging

Enable debug logs by setting:
```yaml
env:
  DEBUG: '@tenderly/github-action'
```

### Troubleshooting:

1. **RPC Connection Issues**
   - Verify access key permissions
   - Ensure network_id is supported

2. **Contract Verification Failed**
   - Verify compiler version matches
   - Check if source code is complete
   - Ensure constructor arguments are correct

3. **Test Execution Timeouts**
   - Adjust GitHub Actions timeout
   - Verify RPC endpoint stability

## Notes

- Virtual TestNets are automatically cleaned up after the workflow completes
- Use matrix builds for testing across multiple networks
- Contract verification works automatically. Follow the guides for verification with [Hardhat](https://docs.tenderly.co/contract-verification/hardhat) and [Foundry](https://docs.tenderly.co/contract-verification/foundry).
- Use unique chain IDs when possible by prefixing with 7357 to avoid transaction replay attacks 

## License

[Tenderly](LICENSE)
