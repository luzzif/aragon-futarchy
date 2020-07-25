pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

interface IConditionalTokens {
    function prepareCondition(
        address _oracle,
        bytes32 _questionId,
        uint _outcomesAmount
    ) external;
    function getConditionId(
        address _oracle,
        bytes32 _questionId,
        uint _outcomeSlotCount
    ) external pure returns (bytes32);
    function payoutNumerators(bytes32 _conditionId, uint _outcomeIndex) public view returns (uint);
}

interface ILMSRMarketMaker {
    function trade(int[] memory outcomeTokenAmounts, int collateralLimit)
        public
        returns (int netCost);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract IWETH9 is IERC20 {
    function deposit() public payable;
}

interface ILMSRMarketMakerFactory {
    function createLMSRMarketMaker(
        address pmSystem,
        address collateralToken,
        bytes32[] conditionIds,
        uint64 fee,
        address whitelist,
        uint funding
    ) external returns (ILMSRMarketMaker lmsrMarketMaker);
}


contract PredictionMarketsApp is AragonApp {
    using SafeMath for uint256;

    /// ACL
    bytes32 constant public CREATE_MARKET_ROLE = keccak256("CREATE_MARKET_ROLE");

    /// Events
    event CreateMarket(
        bytes32 indexed conditionId,
        uint number,
        address creator,
        address oracle,
        bytes32 question,
        bytes32[] outcomes,
        uint timestamp
    );

    IConditionalTokens public conditionalTokens;
    ILMSRMarketMakerFactory public lmsrMarketMakerFactory;
    IWETH9 public weth9Token;
    uint public marketsNumber;

    function initialize(
        address _conditionalTokensAddress,
        address _marketMakerFactoryAddress,
        address _weth9TokenAddress
    ) public onlyInit {
        conditionalTokens = IConditionalTokens(_conditionalTokensAddress);
        lmsrMarketMakerFactory = ILMSRMarketMakerFactory(_marketMakerFactoryAddress);
        weth9Token = IWETH9(_weth9TokenAddress);
        initialized();
    }

    function createMarket(
            address _oracle,
            bytes32 _questionId,
            uint _outcomesAmount,
            bytes32 _question,
            bytes32[] _outcomes) external payable auth(CREATE_MARKET_ROLE) {
        conditionalTokens.prepareCondition(_oracle, _questionId, _outcomesAmount);
        weth9Token.deposit.value(msg.value);
        weth9Token.approve(address(lmsrMarketMakerFactory), msg.value);
        bytes32[] memory _conditionIds = new bytes32[](1);
        bytes32 _conditionId = conditionalTokens.getConditionId(_oracle, _questionId, _outcomesAmount);
        _conditionIds[0] = _conditionId;
        lmsrMarketMakerFactory.createLMSRMarketMaker(
            address(conditionalTokens),
            address(weth9Token),
            _conditionIds,
            // TODO: think about a possible fee
            0,
            address(0x0000000000000000000000000000000000000000),
            msg.value
        );
        marketsNumber++;
        emit CreateMarket(
            _conditionId,
            marketsNumber,
            msg.sender,
            _oracle,
            _question,
            _outcomes,
            getTimestamp64()
        );
    }

    function getPayoutNumerators(bytes32 _conditionId, uint _outcomeIndex) external view returns(uint) {
        return conditionalTokens.payoutNumerators(_conditionId, _outcomeIndex);
    }
}
