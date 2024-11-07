const core = require('@actions/core');
const { createVirtualTestNet, setupTenderlyConfig } = require('./tenderly');

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
    blockNumber: { required: true }
  };

  Object.entries(requiredInputs).forEach(([key, rules]) => {
    const value = inputs[key];
    
    // First check if value exists when required
    if (rules.required && (!value || value.trim() === '')) {
      throw new Error(`Input '${key}' is required`);
    }

    // Only check numeric if value exists and isNumeric is specified
    if (rules.isNumeric && value && isNaN(parseInt(value))) {
      throw new Error(`Input '${key}' must be a valid number`);
    }
  });

  core.debug('Input validation passed');
  return true;
}

async function run() {
  try {
    const inputs = {
      accessKey: core.getInput('access_key', { required: true, trimWhitespace: true }),
      projectName: core.getInput('project_name', { required: true, trimWhitespace: true }),
      accountName: core.getInput('account_name', { required: true, trimWhitespace: true }),
      testnetName: core.getInput('testnet_name', { required: true, trimWhitespace: true }),
      networkId: core.getInput('network_id', { required: true, trimWhitespace: true }),
      chainId: core.getInput('chain_id', { trimWhitespace: true }) || core.getInput('network_id', { trimWhitespace: true }),
      blockNumber: core.getInput('block_number', { required: true, trimWhitespace: true })
    };

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