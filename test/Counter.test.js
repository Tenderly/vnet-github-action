const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Counter", function () {
    it("should increment the count", async function () {
        const Counter = await ethers.getContractFactory("Counter");
        console.log("Deploying Counter contract...");
        const counter = await Counter.deploy();
        await counter.waitForDeployment();
        console.log("Counter contract deployed at:", await counter.getAddress());

        // Create a new instance of the contract
        const counterInstance = await ethers.getContractAt("Counter", await counter.getAddress());

        // Check initial count
        const initialCount = await counterInstance.getCount();
        console.log("Initial count:", initialCount);
        expect(initialCount).to.equal(0);

        // Increment the count
        await counterInstance.increment();

        // Check the updated count
        const updatedCount = await counterInstance.getCount();
        console.log("Updated count:", updatedCount);
        expect(updatedCount).to.equal(1);
    });
});