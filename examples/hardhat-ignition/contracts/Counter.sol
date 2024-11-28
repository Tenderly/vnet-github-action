// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Counter {
    uint256 private _count;

    function increment() public {
        _count += 1;
    }

    function decrement() public {
        require(_count > 0, "Counter: cannot decrement below zero");
        _count -= 1;
    }

    function getCount() public view returns (uint256) {
        return _count;
    }
}