//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* This contract allows staking & rewards for a single asset where deposits
can only come from a whitelisted contract, used as a post IDO gated farm */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakingSingle is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
        int256 rewardDebt;
    }

    uint256 private constant ACC_PRECISION = 1e12;
    uint256 public totalAmount;
    uint256 public rewardPerBlock;
    uint128 public accRewardPerShare;
    uint64 public lastRewardBlock;
    IERC20 public token;
    address public depositor;
    mapping(address => UserInfo) public userInfo;

    event Deposit(address indexed user, uint256 amount, address indexed to);
    event Withdraw(address indexed user, uint256 amount, address indexed to);
    event EmergencyWithdraw(address indexed user, uint256 amount, address indexed to);
    event Harvest(address indexed user, uint256 amount);
    event Update(uint64 lastRewardBlock, uint256 totalAmount, uint256 accRewardPerShare);

    constructor(address _token, uint256 _rewardPerBlock, address _depositor) Ownable() {
        lastRewardBlock = uint64(block.number);
        rewardPerBlock = _rewardPerBlock;
        token = IERC20(_token);
        depositor = _depositor;
    }

    function pendingRewards(address _user) external view returns (uint256 pending) {
        UserInfo storage user = userInfo[_user];
        uint256 _accRewardPerShare = accRewardPerShare;
        if (block.number > lastRewardBlock && totalAmount != 0) {
            uint256 blocks = block.number - lastRewardBlock;
            uint256 reward = blocks * rewardPerBlock;
            _accRewardPerShare = _accRewardPerShare + ((reward * ACC_PRECISION) / totalAmount);
        }
        pending = uint256(int256((user.amount * accRewardPerShare) / ACC_PRECISION) - user.rewardDebt);
    }

    function update() public {
        if (block.number > lastRewardBlock) {
            if (totalAmount > 0) {
                uint256 blocks = block.number - lastRewardBlock;
                uint256 reward = blocks * rewardPerBlock;
                accRewardPerShare = accRewardPerShare + uint128((reward * ACC_PRECISION) / totalAmount);
            }
            lastRewardBlock = uint64(block.number);
        }
        emit Update(lastRewardBlock, totalAmount, accRewardPerShare);
    }

    function deposit(uint256 amount, address to) external nonReentrant {
        require(depositor == msg.sender, "not depositor");
        update();
        UserInfo storage user = userInfo[to];

        totalAmount += amount;
        user.amount = user.amount + amount;
        user.rewardDebt = user.rewardDebt + int256((amount * accRewardPerShare) / ACC_PRECISION);

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount, to);
    }

    function withdraw(uint256 amount, address to) public nonReentrant {
        update();
        UserInfo storage user = userInfo[msg.sender];

        user.rewardDebt = user.rewardDebt - int256((amount * accRewardPerShare) / ACC_PRECISION);
        user.amount = user.amount - amount;
        totalAmount -= amount;

        token.safeTransfer(to, amount);

        emit Withdraw(msg.sender, amount, to);
    }

    function harvest(address to) public {
        update();
        UserInfo storage user = userInfo[msg.sender];
        int256 accumulatedReward = int256((user.amount * accRewardPerShare) / ACC_PRECISION);
        uint256 _pendingReward = uint256(accumulatedReward - user.rewardDebt);

        user.rewardDebt = accumulatedReward;

        if (_pendingReward != 0) {
            token.safeTransfer(to, _pendingReward);
        }
        
        emit Harvest(msg.sender, _pendingReward);
    }
    
    function withdrawAndHarvest(uint256 amount, address to) external {
        harvest(to);
        withdraw(amount, to);
    }

    function emergencyWithdraw(address to) external {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        totalAmount -= amount;
        user.amount = 0;
        user.rewardDebt = 0;
        token.safeTransfer(to, amount);
        emit EmergencyWithdraw(msg.sender, amount, to);
    }
}
