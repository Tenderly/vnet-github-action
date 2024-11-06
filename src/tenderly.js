const axios = require('axios');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { logger } = require('./utils/logger');

const API_BASE_URL = 'https://api.tenderly.co/api/v1';
const CONFIG_FILE_MODE = 0o600;
const RPC_TYPES = {
  ADMIN: 'Admin RPC',
  PUBLIC: 'Public RPC'
};

async function createVirtualTestNet(inputs) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const slug = `${inputs.testnetSlug}-${timestamp}`;

    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/account/${inputs.accountName}/project/${inputs.projectName}/vnets`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Access-Key': inputs.accessKey
      },
      data: {
        slug,
        display_name: inputs.testnetName,
        fork_config: {
          network_id: parseInt(inputs.networkId),
          block_number: inputs.blockNumber
        },
        virtual_network_config: {
          chain_config: {
            chain_id: parseInt(inputs.chainId || inputs.networkId)
          }
        },
        sync_state_config: {
          enabled: false
        },
        explorer_page_config: {
          enabled: true,
          verification_visibility: "bytecode"
        }
      }
    });

    const { data } = response;
    
    if (!data.rpcs || data.rpcs.length === 0) {
      throw new Error('No RPC endpoints returned from Tenderly API');
    }

    return {
      id: data.id,
      adminRpcUrl: data.rpcs.find(rpc => rpc.name === RPC_TYPES.ADMIN)?.url,
      publicRpcUrl: data.rpcs.find(rpc => rpc.name === RPC_TYPES.PUBLIC)?.url
    };

  } catch (error) {
    if (error.response) {
      // API error response
      const message = error.response.data.error?.message || error.response.data;
      throw new Error(`Tenderly API Error: ${message}`);
    }
    throw error;
  }
}

async function stopVirtualTestNet(inputs) {
  try {
    await axios({
      method: 'patch',
      url: `${API_BASE_URL}/account/${inputs.accountName}/project/${inputs.projectName}/vnets/${inputs.testnetId}`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Access-Key': inputs.accessKey
      },
      data: {
        status: 'stopped'
      }
    });
  } catch (error) {
    if (error.response) {
      const message = error.response.data.error?.message || error.response.data;
      throw new Error(`Failed to stop TestNet: ${message}`);
    }
    throw error;
  }
}

async function setupTenderlyConfig(accessKey) {
  try {
    const configDir = path.join(os.homedir(), '.tenderly');
    const configFile = path.join(configDir, 'config.yaml');

    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configFile, `access_key: ${accessKey}`);
    await fs.chmod(configFile, CONFIG_FILE_MODE);
    
    logger.debug('Tenderly config file created successfully');
  } catch (error) {
    throw new Error(`Failed to create Tenderly config: ${error.message}`);
  }
}

module.exports = {
  createVirtualTestNet,
  stopVirtualTestNet,
  setupTenderlyConfig
};