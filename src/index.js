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
    access_key: { minLength: 20 },
    project_name: { required: true },
    account_name: { required: true },
    testnet_name: { required: true },
    network_id: { required: true, isNumeric: true },
    block_number: { required: true }
  };

  Object.entries(requiredInputs).forEach(([key, rules]) => {
    const value = inputs[key];
    if (rules.required && !value) {
      throw new Error(`Input '${key}' is required`);
    }
    if (rules.minLength && value.length < rules.minLength) {
      throw new Error(`Input '${key}' must be at least ${rules.minLength} characters`);
    }
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
      accessKey: core.getInput('access_key', { required: true }),
      projectName: core.getInput('project_name', { required: true }),
      accountName: core.getInput('account_name', { required: true }),
      testnetName: core.getInput('testnet_name', { required: true }),
      networkId: core.getInput('network_id'),
      chainId: core.getInput('chain_id'),
      blockNumber: core.getInput('block_number')
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
    
    await setupTenderlyConfig(inputs.accessKey);

    core.info('Tenderly Virtual TestNet created successfully');
    core.info(`TestNet ID: ${testNet.id}`);
    core.info(`TestNet Slug: ${inputs.testnetSlug}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();