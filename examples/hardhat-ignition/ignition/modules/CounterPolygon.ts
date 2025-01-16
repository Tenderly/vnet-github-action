// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CounterModule = buildModule("CounterPolygon", (m) => {

  const counter = m.contract("Counter", [], {
    id: "Counter_v1",
  });

  return { counter };
});

export default CounterModule;
