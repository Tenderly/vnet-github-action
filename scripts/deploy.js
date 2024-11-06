const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const Counter = await hre.ethers.getContractFactory("Counter");
    console.log("Deploying Counter...");
    const counter = await Counter.deploy();
    await counter.waitForDeployment();
    console.log("Counter deployed to:", await counter.getAddress());


    const deploymentInfo = {
        counterAddress: await counter.getAddress()
    };
    fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('Deployment info saved to deployment.json');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });