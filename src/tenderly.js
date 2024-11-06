const core = require('@actions/core');
const axios = require('axios');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

const API_BASE_URL = 'https://api.tenderly.co/api/v1';
const CONFIG_FILE_MODE = 0o600;
const RPC_TYPES = {
  ADMIN: 'Admin RPC',
  PUBLIC: 'Public RPC'
};

async function createVirtualTestNet(inputs) {
  try {
    core.debug('Creating Virtual TestNet...');
    const timestamp = Math.floor(Date.now() / 1000);
    const slug = `${inputs.testnetSlug}-${timestamp}`;

    core.debug(`Making API request to create TestNet with slug: ${slug}`);
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
          chain_id: inputs.chainId ? parseInt(inputs.chainId) : undefined,
          block_number: inputs.blockNumber
        }
      }
    });

    const { data } = response;
    core.debug('API Response:', JSON.stringify(data, null, 2));
    
    if (!data) {
      throw new Error('No data returned from Tenderly API');
    }

    if (!data.rpcs) {
      throw new Error('No RPC data in response: ' + JSON.stringify(data));
    }

    const adminRpc = data.rpcs.find(rpc => rpc.name === RPC_TYPES.ADMIN);
    const publicRpc = data.rpcs.find(rpc => rpc.name === RPC_TYPES.PUBLIC);

    if (!adminRpc || !publicRpc) {
      throw new Error('Missing required RPC endpoints in response: ' + JSON.stringify(data.rpcs));
    }

    return {
      id: data.id,
      adminRpcUrl: adminRpc.url,
      publicRpcUrl: publicRpc.url
    };

  } catch (error) {
    if (error.response) {
      core.debug('API Error Response:', JSON.stringify(error.response.data, null, 2));
      const message = error.response.data.error?.message || JSON.stringify(error.response.data);
      throw new Error(`Failed to create TestNet: ${message}`);
    }
    core.debug('Error:', error);
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

async function stopVirtualTestNet(inputs) {
  try {
    core.debug('Stopping Virtual TestNet...');
    
    if (!inputs.testnetId) {
      throw new Error('TestNet ID is required for cleanup');
    }

    const response = await axios({
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

    core.debug('TestNet stopped successfully');
    return response.data;

  } catch (error) {
    if (error.response) {
      core.debug('API Error Response:', JSON.stringify(error.response.data, null, 2));
      const message = error.response.data.error?.message || JSON.stringify(error.response.data);
      throw new Error(`Failed to stop TestNet: ${message}`);
    }
    core.debug('Error:', error);
    throw error;
  }
}

module.exports = {
  createVirtualTestNet,
  stopVirtualTestNet,
  setupTenderlyConfig
};