pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

interface IConditionalTokens {
    function prepareCondition(address oracle, bytes32 questionId, uint outcomesAmount) external;
    function getConditionId(address oracle, bytes32 questionId, uint outcomeSlotCount) external pure returns (bytes32);
    function getCollectionId(bytes32 parentCollectionId, bytes32 conditionId, uint indexSet) external view returns (bytes32);
    function getPositionId(IERC20 collateralToken, bytes32 collectionId) external view returns (uint);
    function balanceOf(address owner, uint positionId) external view returns (uint);
    function reportPayouts(bytes32 questionId, uint[] payouts) external;
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes data) external;
    function setApprovalForAll(address operator, bool approved) external;
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
    function calcMarketFee(uint outcomeTokenCost) public view returns (uint);
    function close() public;
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
    function deposit() external payable;
}

interface ILMSRMarketMakerFactory {
    function createLMSRMarketMaker(
        IConditionalTokens pmSystem,
        IERC20 collateralToken,
        bytes32[] conditionIds,
        uint64 fee,
        IWhitelist whitelist,
        uint funding
    ) external returns (ILMSRMarketMaker lmsrMarketMaker);
}

interface IWhitelist {
  function addToWhitelist(address[] users) external;
  function removeFromWhitelist(address[] users) external;
}

contract PredictionMarketsApp is AragonApp, IERC1155Receiver {
    using SafeMath for uint256;

    /// ACL
    bytes32 constant public CREATE_MARKET_ROLE = keccak256("CREATE_MARKET_ROLE");
    bytes32 constant public TRADE_ROLE = keccak256("TRADE_ROLE");
    bytes32 constant public CLOSE_MARKET_ROLE = keccak256("CLOSE_MARKET_ROLE");

    /// Events
    event CreateMarket(bytes32 conditionId, bytes32[] outcomes);

    event Trade(
        bytes32 indexed conditionId,
        int[] outcomeTokenAmounts,
        address transactor,
        uint timestamp
    );

    event CloseMarket(
        bytes32 indexed conditionId,
        address closer,
        uint[] results,
        uint timestamp
    );

    struct MarketData {
        ILMSRMarketMaker marketMaker;
        bytes32 questionId;
        address creator;
        bytes32 question;
        address oracle;
        uint timestamp;
        uint endsAt;
        bool exists;
    }

    IConditionalTokens public conditionalTokens;
    ILMSRMarketMakerFactory public lmsrMarketMakerFactory;
    IWhitelist public whitelist;
    IWETH9 public weth9Token;
    address private currentTrader;
    mapping(bytes32 => MarketData) public marketData;
    mapping(address => mapping(uint => uint)) public tokenHoldings;

    function initialize(
        address _conditionalTokensAddress,
        address _marketMakerFactoryAddress,
        address _weth9TokenAddress,
        address _whitelistAddress
    ) public onlyInit {
        conditionalTokens = IConditionalTokens(_conditionalTokensAddress);
        lmsrMarketMakerFactory = ILMSRMarketMakerFactory(_marketMakerFactoryAddress);
        weth9Token = IWETH9(_weth9TokenAddress);
        whitelist = IWhitelist(_whitelistAddress);
        initialized();
    }

    function createMarket(
            address _oracle,
            bytes32 _questionId,
            uint _outcomesAmount,
            bytes32 _question,
            bytes32[] _outcomes,
            uint endsAt) external payable auth(CREATE_MARKET_ROLE) {
        conditionalTokens.prepareCondition(address(this), _questionId, _outcomesAmount);
        weth9Token.deposit.value(msg.value)();
        weth9Token.approve(address(lmsrMarketMakerFactory), msg.value);
        bytes32 _conditionId = conditionalTokens.getConditionId(address(this), _questionId, _outcomesAmount);
        bytes32[] memory _conditionIds = new bytes32[](1);
        _conditionIds[0] = _conditionId;
        ILMSRMarketMaker _marketMaker = lmsrMarketMakerFactory.createLMSRMarketMaker(
            conditionalTokens,
            weth9Token,
            _conditionIds,
            0,
            IWhitelist(address(0)),
            msg.value
        );
        conditionalTokens.setApprovalForAll(address(_marketMaker), true);
        marketData[_conditionId] = MarketData({
            marketMaker: _marketMaker,
            oracle: _oracle,
            exists: true,
            creator: msg.sender,
            question: _question,
            timestamp: getTimestamp64(),
            endsAt: endsAt,
            questionId: _questionId
        });
        emit CreateMarket(_conditionId, _outcomes);
    }

    function getCollectionId(bytes32 _parentCollectionId, bytes32 _conditionId, uint _indexSet) external view returns (bytes32) {
        return conditionalTokens.getCollectionId(_parentCollectionId, _conditionId, _indexSet);
    }

    function getPositionId(IERC20 _collateralToken, bytes32 _collectionId) external view returns (uint) {
        return conditionalTokens.getPositionId(_collateralToken, _collectionId);
    }

    function balanceOf(uint _positionId) public view returns (uint) {
        return tokenHoldings[msg.sender][_positionId];
    }

    function getMarginalPrice(bytes32 _conditionId, uint8 _outcomeIndex) external view returns (uint) {
        MarketData storage data = marketData[_conditionId];
        require(data.exists, "NON_EXISTENT_CONDITION");
        return data.marketMaker.calcMarginalPrice(_outcomeIndex);
    }

    function getNetCost(int[] _outcomeTokenAmounts, bytes32 _conditionId) external view returns (int) {
        MarketData storage data = marketData[_conditionId];
        require(data.exists, "NON_EXISTENT_CONDITION");
        return data.marketMaker.calcNetCost(_outcomeTokenAmounts);
    }

    function getMarketFee(bytes32 _conditionId, uint _outcomeTokenCost) external view returns (uint) {
        MarketData storage data = marketData[_conditionId];
        require(data.exists, "NON_EXISTENT_CONDITION");
        return data.marketMaker.calcMarketFee(_outcomeTokenCost);
    }

    function trade(
            bytes32 _conditionId,
            int[] _outcomeTokenAmounts,
            int _collateralLimit) external payable auth(TRADE_ROLE) returns (int) {
        MarketData storage data = marketData[_conditionId];
        require(data.exists, "NON_EXISTENT_CONDITION");
        currentTrader = msg.sender;
        if(msg.value > 0) {
            // Even though it's not certain, if someone sends ETH, they
            // probably want to buy tokens, so perform ETH -> WETH conversion
            // and set allowance accordingly
            weth9Token.deposit.value(msg.value)();
            weth9Token.approve(address(data.marketMaker), msg.value);
        } else {
            // checking if the user wants to sell more than what they have
            for(uint _i; _i < _outcomeTokenAmounts.length; _i++) {
                int _outcomeTokenAmount = _outcomeTokenAmounts[_i];
                if(_outcomeTokenAmount < 0) {
                    bytes32 _collectionId = this.getCollectionId(bytes32(""), _conditionId, _i + 1);
                    uint _positionId = this.getPositionId(weth9Token, _collectionId);
                    require(tokenHoldings[msg.sender][_positionId] >= uint(-_outcomeTokenAmount), "INSUFFICIENT_BALANCE");
                }
            }
        }
        int _netCost = data.marketMaker.trade(_outcomeTokenAmounts, _collateralLimit);
        emit Trade(_conditionId, _outcomeTokenAmounts, currentTrader, getTimestamp64());
        return _netCost;
    }

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        return interfaceId == this.onERC1155Received.selector ^ this.onERC1155BatchReceived.selector;
    }

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes _data
    ) external returns(bytes4) {
        tokenHoldings[currentTrader][_id] = _value;
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
            address _operator,
            address _from,
            uint256[] _ids,
            uint256[] _values,
            bytes _data) external returns(bytes4) {
        for(uint _i; _i < _ids.length; _i++) {
            tokenHoldings[currentTrader][_ids[_i]] = _values[_i];
        }
        return this.onERC1155BatchReceived.selector;
    }

    function closeMarket(
            uint[] _payouts,
            bytes32 _conditionId,
            bytes32 _questionId) external auth(CLOSE_MARKET_ROLE) returns (int) {
        MarketData storage data = marketData[_conditionId];
        require(data.exists, "NON_EXISTENT_CONDITION");
        require(data.oracle == msg.sender, "INVALID_ORACLE");
        data.marketMaker.close();
        conditionalTokens.reportPayouts(_questionId, _payouts);
        emit CloseMarket(_conditionId, msg.sender, _payouts, getTimestamp64());
    }
}
