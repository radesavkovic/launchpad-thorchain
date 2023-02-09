// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IERC677Receiver.sol";

contract ERC20Mock is ERC20 {
    event TransferWithData(address indexed from, address indexed to, uint value, bytes data);

    constructor(
        string memory name,
        string memory symbol,
        uint256 supply
    ) public ERC20(name, symbol) {
        _mint(msg.sender, supply);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function transferAndCall(address _to, uint _value, bytes calldata _data) public returns (bool success) {
        super.transfer(_to, _value);
        emit TransferWithData(msg.sender, _to, _value, _data);
        if (isContract(_to)) {
            contractFallback(_to, _value, _data);
        }
        return true;
    }

    function contractFallback(address _to, uint _value, bytes calldata _data)
        private
    {
        IERC677Receiver receiver = IERC677Receiver(_to);
        receiver.onTokenTransfer(msg.sender, _value, _data);
    }

    function isContract(address _addr)
        private
        view
        returns (bool hasCode)
    {
        uint length;
        assembly { length := extcodesize(_addr) }
        return length > 0;
    }
}
