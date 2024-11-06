const core = require('@actions/core');
const { logger } = require('./logger');

function validateInputs(inputs) {
  const requiredInputs = {
    access_key: { minLength: 20 },
    project_name: { required: true },
    account_name: { required: true },
    testnet_slug: { required: true },
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

  logger.debug('Input validation passed');
  return true;
}