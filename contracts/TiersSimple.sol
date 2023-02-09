//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IERC677Receiver.sol";

contract TiersSimple is IERC677Receiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
        uint256 lastDeposit;
    }

    IERC20 public token;
    bool public paused;
    mapping(address => UserInfo) public userInfos;
    address[] public users;

    event SetPaused(bool paused);
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    constructor(address _token) ReentrancyGuard() Ownable() {
        token = IERC20(_token);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit SetPaused(_paused);
    }

    function usersLength() public view returns (uint256) {
        return users.length;
    }

    function deposit(uint256 amount) external nonReentrant {
        require(!paused, "paused");
        UserInfo storage userInfo = userInfos[msg.sender];

        token.safeTransferFrom(msg.sender, address(this), amount);

        userInfo.amount += amount;
        userInfo.lastDeposit = block.timestamp;

        emit Deposit(msg.sender, amount);
    }

    function onTokenTransfer(address user, uint amount, bytes calldata _data) external override {
        require(!paused, "paused");
        require(msg.sender == address(token), "onTokenTransfer: not token");

        UserInfo storage userInfo = userInfos[user];

        userInfo.amount += amount;
        userInfo.lastDeposit = block.timestamp;

        emit Deposit(user, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        UserInfo storage userInfo = userInfos[msg.sender];
        require(!paused, "paused");
        require(block.timestamp > userInfo.lastDeposit + 7 days, "can't withdraw before 7 days after last deposit");
        require(amount <= userInfo.amount, "amount bigger than balance");

        userInfo.amount -= amount;

        token.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    function rescueTokens(address token, uint amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
