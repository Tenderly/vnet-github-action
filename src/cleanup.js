const core = require('@actions/core');
const { stopVirtualTestNet } = require('./tenderly');

async function cleanup() {
  try {
    const mode = core.getInput('mode').toUpperCase();
    
    if (mode === 'CD') {
      core.info('Running in CD mode - skipping TestNet cleanup');
      return;
    }

    const testnetId = process.env.TENDERLY_TESTNET_ID;
    if (!testnetId) {
      core.warning('No TestNet ID found, skipping cleanup');
      return;
    }

    const inputs = {
      accessKey: core.getInput('access_key'),
      projectName: process.env.TENDERLY_PROJECT_NAME,
      accountName: process.env.TENDERLY_ACCOUNT_NAME,
      testnetId
    };

    await stopVirtualTestNet(inputs);
    core.info('Virtual TestNet stopped successfully');
  } catch (error) {
    core.warning(`Failed to stop Virtual TestNet: ${error.message}`);
  }
}

cleanup();