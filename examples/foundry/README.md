## CI with Foundry

This is sample Foundry project deploying contracts through a Foundry script [Counter.s.sol](script/Counter.s.sol).

Explore the [Foundry CI setup guide](https://docs.tenderly.co/virtual-testnets/ci-cd/github-actions-foundry#configure-foundry) for more details.

## Adding custom chain configuration
For verification process to work, your `foundry.toml` should be configured for the custom Virtual TestNet chain.

### 1. Add the placeholder configuration
Extend your `foundry.toml` with the following placeholder-configuration. 

```toml
[etherscan]
unknown_chain = { key = "${TENDERLY_ACCESS_KEY}", chain = 0, url = "${TENDERLY_FOUNDRY_VERIFICATION_URL}" }
```

For local development, use proper values:
1. replace TENDERLY_ACCESS_KEY with Tenderly API key
2. set `chain` to your selected chain ID
3. replace `TENDERLY_FOUNDRY_VERIFICATION_URL` with $TENDERLY_VIRTUAL_TESTNET_RPC_URL/verify/etherscan

### 2. Add the CLI fixtures to your project for CI
For CI, you can use [fixtures](../../fixtures/load-fixtures.sh) with helper functions that will populate the placeholder values (step 1) with proper ones. 

1. Add the [`load-fixtures.sh`](../../fixtures/load-fixtures.sh) file to your code-base
2. Add a step to `Setup Verification and Fund EOA`. The environment variables are populated by the action.

```yaml
      - name: Setup Verification and Fund EOA on Base
        run: |
          source ../../fixtures/load-fixtures.sh
          update_foundry_config_and_build $TENDERLY_ACCESS_KEY $TENDERLY_FOUNDRY_VERIFICATION_URL_8453  $TENDERLY_CHAIN_ID_8453
          set_wallet_balance $TENDERLY_ADMIN_RPC_URL_8453 ${{ vars.DEPLOYER_WALLET_ADDRESS }} $HUNDRED_ETH
```

