pragma solidity ^0.4.24;

interface IConditionalTokens {
    function prepareCondition(address oracle, bytes32 questionId, uint outcomesAmount) external;
    function getConditionId(address oracle, bytes32 questionId, uint outcomeSlotCount) external pure returns (bytes32);
    function getCollectionId(bytes32 parentCollectionId, bytes32 conditionId, uint indexSet) external view returns (bytes32);
    function getPositionId(IERC20 collateralToken, bytes32 collectionId) external view returns (uint);
    function balanceOf(address owner, uint positionId) external view returns (uint);
    function reportPayouts(bytes32 questionId, uint[] payouts) external;
    function setApprovalForAll(address operator, bool approved) external;
    function redeemPositions(IERC20 collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] indexSets) external;
    function payoutNumerators(bytes32 conditionId, uint256 index) external view returns(uint256);
    function payoutDenominator(bytes32 conditionId) external view returns(uint256);
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes data) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

contract IERC1155Receiver is IERC165 {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes data) external returns(bytes4);
    function onERC1155BatchReceived(address operator, address from, uint256[] ids, uint256[] values, bytes data) external returns(bytes4);
}

interface ILMSRMarketMaker {
    function trade(int[] outcomeTokenAmounts, int collateralLimit) external returns (int netCost);
    function calcMarginalPrice(uint8 outcomeTokenIndex) external view returns (uint price);
    function calcNetCost(int[] outcomeTokenAmounts) external view returns (int netCost);
    function calcMarketFee(uint outcomeTokenCost) external view returns (uint);
    function close() external;
    function atomicOutcomeSlotCount() external view returns(uint);
}

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address) external returns(uint);
}

contract IWETH9 is IERC20 {
    function deposit() external payable;
    function withdraw(uint wad) public;
}

interface ILMSRMarketMakerFactory {
    function createLMSRMarketMaker(
        IConditionalTokens pmSystem,
        IERC20 collateralToken,
        bytes32[] conditionIds,
        uint64 fee,
        address whitelist,
        uint funding
    ) external returns (ILMSRMarketMaker lmsrMarketMaker);
}
