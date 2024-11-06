module.exports = {
    API_BASE_URL: 'https://api.tenderly.co/api/v1',
    CONFIG_FILE_MODE: 0o600,
    DEFAULT_NETWORK_ID: '1',
    DEFAULT_BLOCK_NUMBER: 'latest',
    RPC_TYPES: {
      ADMIN: 'Admin RPC',
      PUBLIC: 'Public RPC'
    },
    ENV_VARS: {
      TESTNET_ID: 'TENDERLY_TESTNET_ID',
      ACCOUNT_NAME: 'TENDERLY_ACCOUNT_NAME',
      PROJECT_NAME: 'TENDERLY_PROJECT_NAME',
      ADMIN_RPC_URL: 'TENDERLY_ADMIN_RPC_URL',
      PUBLIC_RPC_URL: 'TENDERLY_PUBLIC_RPC_URL'
    }
  };