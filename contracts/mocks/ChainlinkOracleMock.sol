//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ChainlinkOracleMock {
  int256 result;

  constructor(int256 _result) {
      result = _result;
  }

  function setResult(int256 _result) external {
      result = _result;
  }

  function latestAnswer() external view returns (int256) {
      return result;
  }
}
