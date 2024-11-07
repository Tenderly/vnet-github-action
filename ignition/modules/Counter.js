const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const MODULE_NAME = "CounterModule";

module.exports = buildModule(MODULE_NAME, (m) => {
    console.log("🚀 Starting Counter Module deployment process");

    // Deploy Counter contract without factory configuration
    const counter = m.contract("Counter", [], {
        id: "Counter_v1",
        onDeploy: async (deployedContract) => {
            console.log(`✅ Counter deployed at: ${deployedContract.address}`);
        }
    });

    return { counter };
});