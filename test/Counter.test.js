const { ethers } = require("hardhat");

describe("Counter", function () {
    it("should increment the count", async function () {

        let Counter = await ethers.getContractFactory("Counter");
        console.log("Deploying Counter contract...");

        let counter = await Counter.deploy();
        counter = await counter.waitForDeployment();
        console.log("Counter contract deployed at:", await counter.getAddress());

        // Create a new instance of the contract
        const counterInstance = await ethers.getContractAt("Counter", await counter.getAddress());

        // Check initial count
        const initialCount = await counterInstance.getCount();
        console.log("Initial count:", initialCount);

        // Increment the count
        await counterInstance.increment();

        // Check the updated count
        const updatedCount = await counterInstance.getCount();
        console.log("Updated count:", updatedCount);
    });
});