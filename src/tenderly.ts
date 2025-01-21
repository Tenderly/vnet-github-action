import * as core from '@actions/core';
import axios from 'axios';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { TenderlyApiResponse, TestNetResponse } from './types';

const API_BASE_URL = 'https://api.tenderly.co/api/v1';

interface TestNetInputs {
  testnetName: string;
  accountName: string;
  projectName: string;
  accessKey: string;
  networkId: string;
  chainId: string | number;
  blockNumber: string;
  stateSync: boolean;
  publicExplorer: boolean;
  verificationVisibility: 'bytecode' | 'abi' | 'src';
}

async function createVirtualTestNet(inputs: TestNetInputs): Promise<TestNetResponse> {
  try {
    core.debug('Creating Virtual TestNet with inputs: ' + JSON.stringify(inputs));
    const slug = uniqueTestNetSlug(inputs.testnetName);

    const requestData = {
      slug,
      display_name: inputs.testnetName,
      fork_config: {
        network_id: parseInt(inputs.networkId),
        block_number: inputs.blockNumber
      },
      virtual_network_config: {
        chain_config: {
          chain_id: parseInt(inputs.chainId.toString())
        }
      },
      sync_state_config: {
        enabled: inputs.stateSync
      },
      explorer_page_config: {
        enabled: inputs.publicExplorer,
        verification_visibility: inputs.verificationVisibility
      }
    };

    const response = await axios.post<TenderlyApiResponse>(
      `${API_BASE_URL}/account/${inputs.accountName}/project/${inputs.projectName}/vnets`,
      requestData,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Access-Key': inputs.accessKey
        }
      }
    );

    const { data } = response;
    if (!data) throw new Error('No data returned from Tenderly API');
    if (!Array.isArray(data.rpcs)) throw new Error(`Invalid RPC data in response: ${JSON.stringify(data)}`);

    const adminRpc = data.rpcs.find(rpc => rpc.name === 'Admin RPC');
    const publicRpc = data.rpcs.find(rpc => rpc.name === 'Public RPC');

    if (!adminRpc || !publicRpc) {
      throw new Error(`Missing RPC endpoints in response: ${JSON.stringify(data.rpcs)}`);
    }

    return {
      id: data.id,
      adminRpcUrl: adminRpc.url,
      publicRpcUrl: publicRpc.url
    };

  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      core.debug('API Error Response: ' + JSON.stringify(error.response.data));
      const message = error.response.data?.error?.message || JSON.stringify(error.response.data);
      throw new Error(`Failed to create TestNet: ${message}`);
    }
    throw error;
  }
}

function uniqueTestNetSlug(testnetName: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `${testnetName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')}-${timestamp}`;
}

async function setupTenderlyConfig(accessKey: string): Promise<void> {
  try {
    const configDir = path.join(os.homedir(), '.tenderly');
    const configFile = path.join(configDir, 'config.yaml');

    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configFile, `access_key: ${accessKey}`);
    
    core.debug('Tenderly config file created successfully');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create Tenderly config: ${error.message}`);
    }
    throw error;
  }
}

interface StopTestNetInputs {
  testnetId: string;
  accountName: string;
  projectName: string;
  accessKey: string;
}

/**
 * Pauses virtual TestNet execution, but keeps data intact.
 * @param inputs API access inputs
 * @returns 
 */
async function stopVirtualTestNet(inputs: StopTestNetInputs): Promise<any> {
  try {
    if (!inputs.testnetId) throw new Error('TestNet ID is required for cleanup');

    const response = await axios.patch(
      `${API_BASE_URL}/account/${inputs.accountName}/project/${inputs.projectName}/vnets/${inputs.testnetId}`,
      { status: 'stopped' },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Access-Key': inputs.accessKey
        }
      }
    );

    core.debug('TestNet stopped successfully');
    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      core.debug('API Error Response:' + JSON.stringify(error.response.data, null, 2));
      const message = error.response.data?.error?.message || JSON.stringify(error.response.data);
      throw new Error(`Failed to stop TestNet: ${message}`);
    }
    throw error;
  }
}

export {
  createVirtualTestNet, setupTenderlyConfig, StopTestNetInputs, stopVirtualTestNet, TestNetInputs,
  TestNetResponse
};
