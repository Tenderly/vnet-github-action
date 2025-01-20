import * as core from '@actions/core';
import * as github from '@actions/github';
import { createVirtualTestNet, setupTenderlyConfig } from './tenderly';
import { createInfraDir, infraFileForCurrentJob, NetworkInfo, setupDeploymentsFolder, storeInfrastructureInfo, tmpBuildOutDir } from './deployment-info';
import { TestNetInputs } from './types';

/**
 * Provides a unique build slug for the current run.
 * @returns Build slug
 */
function buildSlug(){
  return `${github.context.runNumber}-${github.context.runId}`
}

/**
 * Generates a unique slug for the testnet, related to the current run and target network.
 * @param testnetName testnet name
 * @param networkId network id
 * @returns unique slug
 */
function generateSlug(testnetName: string, networkId: string): string {
  return `${github.context.runNumber}-${testnetName}-net-${networkId}-${github.context.workflow}-${github.context.job}-${github.context.runId}`
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function validateInputs(inputs: TestNetInputs): boolean {
  const requiredInputs = {
    accessKey: { required: true },
    projectName: { required: true },
    accountName: { required: true },
    testnetName: { required: true },
    networkId: { required: true, isNumeric: true },
    blockNumber: { required: true },
    publicExplorer: { required: false, isBoolean: true },
    verificationVisibility: { required: false, isOneOf: ['bytecode', 'abi', 'src'] as const }
  };

  Object.entries(requiredInputs).forEach(([key, rules]) => {
    const value = inputs[key as keyof TestNetInputs];

    if (rules.required && (!value || String(value).trim() === '')) {
      throw new Error(`Input '${key}' is required`);
    }

    if ('isNumeric' in rules && value && isNaN(parseInt(String(value)))) {
      throw new Error(`Input '${key}' must be a valid number`);
    }

    if ('isBoolean' in rules && value !== undefined && typeof value !== 'boolean') {
      throw new Error(`Input '${key}' must be a boolean`);
    }

    if ('isOneOf' in rules && value && !rules.isOneOf.includes(value as any)) {
      throw new Error(`Input '${key}' must be one of: ${rules.isOneOf.join(', ')}`);
    }
  });

  core.debug('Input validation passed');
  return true;
}

/**
 * Exports the value as an environment variable (redacted in logs) with the given key.
 * See {@link exportSecretlyWithNetworkId} for exporting secrets.
 * 
 * @param key Variable key
 * @param value Value
 * @param networkId Network ID to export the secret to
 */
function exportWithNetworkId(key: string, value: string | number, networkId: string): void {
  core.exportVariable(`${key}_${networkId}`, value);
}

/**
 * Exports the value as a secret environment variable (redacted in logs) with the given key.
 * See {@link exportWithNetworkId} for exporting non-secret values.
 * 
 * @param key Variable key
 * @param value Value
 * @param networkId Network ID to export the secret to
 */
function exportSecretlyWithNetworkId(key: string, value: string | number, networkId: string): void {
  core.setSecret(value.toString());
  exportWithNetworkId(key, value, networkId);
}

async function run(): Promise<void> {
  try {
    const mode = core.getInput('mode').toUpperCase();
    const chainIdPrefix = core.getInput('chain_id_prefix', { trimWhitespace: true });
    const inputs: Omit<TestNetInputs, 'chainId'> & { chainId: number } = {
      accessKey: core.getInput('access_key', { required: true, trimWhitespace: true }),
      projectName: core.getInput('project_name', { required: true, trimWhitespace: true }),
      accountName: core.getInput('account_name', { required: true, trimWhitespace: true }),
      testnetName: core.getInput('testnet_name', { required: true, trimWhitespace: true }),
      blockNumber: core.getInput('block_number', { required: true, trimWhitespace: true }),
      stateSync: core.getBooleanInput('state_sync', { trimWhitespace: true }),
      publicExplorer: core.getBooleanInput('public_explorer', { trimWhitespace: true }),
      verificationVisibility: core.getInput('verification_visibility', { trimWhitespace: true }) as TestNetInputs['verificationVisibility'],
      networkId: '',
      chainId: 0
    };

    core.exportVariable('TENDERLY_ACCOUNT_NAME', inputs.accountName);
    core.exportVariable('TENDERLY_PROJECT_NAME', inputs.projectName);
    core.exportVariable('TENDERLY_ACCESS_KEY', inputs.accessKey);

    if (!inputs.publicExplorer) {
      inputs.verificationVisibility = 'bytecode';
    }

    const networkIds = core.getMultilineInput("network_id");
    const networkInfo: Record<string, NetworkInfo> = {};

    await Promise.all(
      networkIds.map(async networkId => {
        const networkInputs: TestNetInputs = {
          ...inputs,
          networkId,
          chainId: parseInt(chainIdPrefix + networkId),
          testnetSlug: generateSlug(inputs.testnetName, networkId)
        };
        networkInputs.testnetName = networkInputs.testnetSlug || '';

        validateInputs(networkInputs);
        const testNet = await createVirtualTestNet(networkInputs);

        // Store network info
        networkInfo[networkId] = {
          ...testNet,
          networkId,
          chainId: networkInputs.chainId,
          testnetSlug: networkInputs.testnetSlug || '',
          explorerUrl: inputs.publicExplorer ? `https://dashboard.tenderly.co/${inputs.accountName}/${inputs.projectName}/testnet/${testNet.id}` : undefined
        };

        // export relevant network variables
        exportWithNetworkId('TENDERLY_TESTNET_ID', testNet.id, networkId);
        exportSecretlyWithNetworkId('TENDERLY_ADMIN_RPC_URL', testNet.adminRpcUrl, networkId);
        exportWithNetworkId('TENDERLY_PUBLIC_RPC_URL', testNet.publicRpcUrl, networkId);
        exportWithNetworkId('TENDERLY_TESTNET_SLUG', networkInputs.testnetSlug || '', networkId);
        exportWithNetworkId('TENDERLY_CHAIN_ID', networkInputs.chainId, networkId);
        exportWithNetworkId('TENDERLY_FOUNDRY_VERIFICATION_URL', `${testNet.adminRpcUrl}/verify/etherscan`, networkId);
        
        const buildOutputFile = `${tmpBuildOutDir()}/${networkInputs.testnetSlug}.json`;
        exportWithNetworkId("BUILD_OUTPUT_FILE", buildOutputFile, networkId);
        
        core.exportVariable('BUILD_SLUG', buildSlug());
        core.info(`Build output to ${buildOutputFile}`);
        core.info('Tenderly Virtual TestNet created successfully');
        core.info(`TestNet ID: ${testNet.id}`);
        core.info(`TestNet Slug: ${networkInputs.testnetSlug}`);
        core.info(`Admin RPC URL: ${testNet.adminRpcUrl}`);
        core.info(`Public RPC URL: ${testNet.publicRpcUrl}`);
        core.info(`Foundry Verification URL: ${testNet.adminRpcUrl}/verify/etherscan`);
        return testNet;
      })
    );

    if (mode === 'CD') {
      await setupDeploymentsFolder();
    }
    await createInfraDir();
    await storeInfrastructureInfo(networkInfo);

    await setupTenderlyConfig(inputs.accessKey);
  } catch (error) {
    const err = error as Error;
    core.setFailed(err.message);
  }
}

run();