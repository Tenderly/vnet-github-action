const core = require('@actions/core');
const fs = require('fs').promises;
const path = require('path');
const { createVirtualTestNet, setupTenderlyConfig } = require('./tenderly');

async function loadCdConfig() {
  try {
    const configPath = path.join(process.cwd(), 'tenderly.config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    core.debug(`No tenderly.config.json found or invalid: ${error.message}`);
    return null;
  }
}

function generateSlug(testnetName) {
  const timestamp = Math.floor(Date.now() / 1000);
  const baseSlug = testnetName
    .toLowerCase()           // convert to lowercase
    .trim()                 // remove leading/trailing spaces
    .replace(/\s+/g, '-')   // replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, ''); // remove special characters
  
  return `${baseSlug}-${timestamp}`;
}

function validateInputs(inputs) {
  const requiredInputs = {
    accessKey: { required: true },
    projectName: { required: true },
    accountName: { required: true },
    testnetName: { required: true },
    networkId: { required: true, isNumeric: true },
    blockNumber: { required: true },
    publicExplorer: { required: false, isBoolean: true },
    verificationVisibility: { required: false, isOneOf: ['bytecode', 'abi', 'src'] }
  };

  Object.entries(requiredInputs).forEach(([key, rules]) => {
    const value = inputs[key];

    if (rules.required && (!value || value.trim() === '')) {
      throw new Error(`Input '${key}' is required`);
    }

    if (rules.isNumeric && value && isNaN(parseInt(value))) {
      throw new Error(`Input '${key}' must be a valid number`);
    }

    if (rules.isBoolean && value && typeof value !== 'boolean') {
      throw new Error(`Input '${key}' must be a boolean`);
    }

    if (rules.isOneOf && value && !rules.isOneOf.includes(value)) {
      throw new Error(`Input '${key}' must be one of: ${rules.isOneOf.join(', ')}`);
    }
  });

  core.debug('Input validation passed');
  return true;
}

async function run() {
  try {
    const mode = core.getInput('mode').toUpperCase();
    const inputs = {
      accessKey: core.getInput('access_key', { required: true, trimWhitespace: true }),
      projectName: core.getInput('project_name', { required: true, trimWhitespace: true }),
      accountName: core.getInput('account_name', { required: true, trimWhitespace: true }),
      testnetName: core.getInput('testnet_name', { required: true, trimWhitespace: true }),
      networkId: core.getInput('network_id', { required: true, trimWhitespace: true }),
      chainId: core.getInput('chain_id', { trimWhitespace: true }) || core.getInput('network_id', { trimWhitespace: true }),
      blockNumber: core.getInput('block_number', { required: true, trimWhitespace: true }),
      stateSync: core.getBooleanInput('state_sync', { trimWhitespace: true }),
      publicExplorer: core.getBooleanInput('public_explorer', { trimWhitespace: true }),
      verificationVisibility: core.getInput('verification_visibility', { trimWhitespace: true })
    };

    if (mode === 'CD') {
      const config = await loadCdConfig();
      if (!config) {
        throw new Error('CD mode requires tenderly.config.json');
      }
      
      // Store deployment info for tracking
      const deploymentInfo = {
        testnetId: null,
        timestamp: new Date().toISOString(),
        mode: 'CD',
        environment: inputs.testnetName
      };

      await fs.writeFile(
        path.join(process.cwd(), '.tenderly-deployments.json'),
        JSON.stringify(deploymentInfo, null, 2)
      );
    }

    if (!inputs.publicExplorer) {
      inputs.verificationVisibility = 'bytecode'; // Default to bytecode if public explorer is not enabled
    }

    // Generate slug from testnet name
    inputs.testnetSlug = generateSlug(inputs.testnetName);
    core.debug(`Generated testnet slug: ${inputs.testnetSlug}`);

    validateInputs(inputs);

    const testNet = await createVirtualTestNet(inputs);

    core.exportVariable('TENDERLY_TESTNET_ID', testNet.id);
    core.exportVariable('TENDERLY_ACCOUNT_NAME', inputs.accountName);
    core.exportVariable('TENDERLY_PROJECT_NAME', inputs.projectName);
    core.exportVariable('TENDERLY_ADMIN_RPC_URL', testNet.adminRpcUrl);
    core.exportVariable('TENDERLY_PUBLIC_RPC_URL', testNet.publicRpcUrl);
    core.exportVariable('TENDERLY_TESTNET_SLUG', inputs.testnetSlug);
    core.exportVariable('TENDERLY_CHAIN_ID', inputs.chainId);
    core.exportVariable('TENDERLY_FOUNDRY_VERIFICATION_URL', `${testNet.adminRpcUrl}/verify/etherscan`);

    await setupTenderlyConfig(inputs.accessKey);

    core.info('Tenderly Virtual TestNet created successfully');
    core.info(`TestNet ID: ${testNet.id}`);
    core.info(`TestNet Slug: ${inputs.testnetSlug}`);
    core.info(`Admin RPC URL: ${testNet.adminRpcUrl}`);
    core.info(`Public RPC URL: ${testNet.publicRpcUrl}`);
    core.info(`Foundry Verification URL: ${testNet.adminRpcUrl}/verify/etherscan`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();