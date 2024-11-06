const core = require('@actions/core');

class Logger {
  info(message) {
    core.info(`[Tenderly VNet] ${message}`);
  }

  warning(message) {
    core.warning(`[Tenderly VNet] ${message}`);
  }

  error(message) {
    core.error(`[Tenderly VNet] ${message}`);
  }

  debug(message) {
    core.debug(`[Tenderly VNet] ${message}`);
  }
}

module.exports = {
  logger: new Logger()
};