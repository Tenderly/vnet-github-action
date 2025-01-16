#!/bin/bash

set_wallet_balance() {
    if [ "$#" -ne 3 ]; then
        echo "Usage: set_wallet_balance RPC_URL WALLET_ADDRESS BALANCE_HEX"
        return 1
    fi

    local rpc_url="$1"
    local wallet_address="$2"
    local balance_hex="$3"

    curl --location "$rpc_url" \
        --header 'Content-Type: application/json' \
        --data "{
            \"jsonrpc\": \"2.0\",
            \"method\": \"tenderly_setBalance\",
            \"params\": [\"$wallet_address\", \"$balance_hex\"],
            \"id\": \"1\"
        }"
}

update_foundry_config_and_build() {
    if [ "$#" -ne 3 ]; then
        echo "Usage: update_foundry_config_and_build ACCESS_KEY VERIFICATION_URL CHAIN_ID"
        return 1
    fi

    local access_key="$1"
    local verification_url="$2"
    local chain_id="$3"

    # Create temporary file and update foundry.toml
    sed -e "s|\${TENDERLY_ACCESS_KEY}|$access_key|g" \
        -e "s|\${TENDERLY_FOUNDRY_VERIFICATION_URL}|$verification_url|g" \
        -e "s/\(unknown_chain[[:space:]]*=[[:space:]]*{[^}]*chain[[:space:]]*=[[:space:]]*\)[0-9][0-9]*/\1$chain_id/g" \
        foundry.toml > foundry.toml.tmp && mv foundry.toml.tmp foundry.toml
}

# Export constant
HUNDRED_ETH="0xDE0B6B3A7640000"
export HUNDRED_ETH
