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
    function setApprovalForAll(address operator, bool approved) external;
    function redeemPositions(IERC20 collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] indexSets) external;
    function payoutNumerators(bytes32 conditionId, uint256 index) external view returns(uint256);
    function payoutDenominator(bytes32 conditionId) external view returns(uint256);
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
}

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
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
        address whitelist,
        uint funding
    ) external returns (ILMSRMarketMaker lmsrMarketMaker);
}

contract PredictionMarketsApp is AragonApp, IERC1155Receiver {
    using SafeMath for uint256;

    /// ACL
    bytes32 constant public CREATE_MARKET_ROLE = keccak256("CREATE_MARKET_ROLE");
    bytes32 constant public TRADE_ROLE = keccak256("TRADE_ROLE");
    bytes32 constant public CLOSE_MARKET_ROLE = keccak256("CLOSE_MARKET_ROLE");

    /// Events
    event Trade(bytes32 conditionId, int[] outcomeTokenAmounts, address transactor, uint timestamp);
    event CreateMarket(bytes32 conditionId, bytes32[] outcomes);
    event CloseMarket(bytes32 conditionId, uint[] payouts, uint timestamp, uint[] marginalPricesAtClosure);
    event RedeemPositions(address redeemer, bytes32 conditionId);

    struct MarketData {
        ILMSRMarketMaker marketMaker;
        bytes32 questionId;
        address creator;
        string question;
        address oracle;
        uint timestamp;
        uint endsAt;
        bool exists;
    }

    IConditionalTokens public conditionalTokens;
    ILMSRMarketMakerFactory public lmsrMarketMakerFactory;
    IWETH9 public weth9Token;
    mapping(bytes32 => MarketData) public marketData;
    mapping(address => mapping(uint => uint)) public tokenHoldings;
    mapping(address => mapping(bytes32 => bool)) public redeemedPositions;

    modifier requiresMarketData(bytes32 _conditionId) {
        require(marketData[_conditionId].exists, "NON_EXISTENT_CONDITION");
        _;
    }

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

    /**
      * @notice Create a prediction market
      */
    function createMarket(
            address _oracle,
            bytes32 _questionId,
            uint _outcomesAmount,
            string _question,
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
            address(0),
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

    function getMarginalPrice(bytes32 _conditionId, uint8 _outcomeIndex)
            external
            view
            requiresMarketData(_conditionId)
            returns (uint) {
        return marketData[_conditionId].marketMaker.calcMarginalPrice(_outcomeIndex);
    }

    function getNetCost(int[] _outcomeTokenAmounts, bytes32 _conditionId)
            external
            view
            requiresMarketData(_conditionId)
            returns (int) {
        return marketData[_conditionId].marketMaker.calcNetCost(_outcomeTokenAmounts);
    }

    function getMarketFee(bytes32 _conditionId, uint _outcomeTokenCost)
            external
            view
            requiresMarketData(_conditionId)
            returns (uint) {
        return marketData[_conditionId].marketMaker.calcMarketFee(_outcomeTokenCost);
    }

    /**
      * @notice Buy outcome shares
      */
    function buy(bytes32 _conditionId, int[] _outcomeTokenAmounts, int _collateralLimit)
            external
            payable
            auth(TRADE_ROLE)
            requiresMarketData(_conditionId)
            returns (int) {
        require(msg.value >= uint(_collateralLimit), "NOT_ENOUGH_COLLATERAL");
        ILMSRMarketMaker _marketMaker = marketData[_conditionId].marketMaker;
        weth9Token.deposit.value(msg.value)();
        weth9Token.approve(address(_marketMaker), msg.value);
        for(uint _i; _i < _outcomeTokenAmounts.length; _i++) {
            uint _positionId = this.getPositionId(
                weth9Token,
                this.getCollectionId(bytes32(""), _conditionId, _i + 1)
            );
            tokenHoldings[msg.sender][_positionId] = tokenHoldings[msg.sender][_positionId] + uint(_outcomeTokenAmounts[_i]);
        }
        _marketMaker.trade(_outcomeTokenAmounts, _collateralLimit);
        emit Trade(_conditionId, _outcomeTokenAmounts, msg.sender, getTimestamp64());
    }

    /**
      * @notice Sell outcome shares
      */
    function sell(bytes32 _conditionId, int[] _outcomeTokenAmounts, int _collateralLimit)
            external
            payable
            auth(TRADE_ROLE)
            requiresMarketData(_conditionId)
            returns (int) {
        for(uint _i; _i < _outcomeTokenAmounts.length; _i++) {
            uint _positionId = this.getPositionId(
                weth9Token,
                this.getCollectionId(bytes32(""), _conditionId, _i + 1)
            );
            require(tokenHoldings[msg.sender][_positionId] >= uint(_outcomeTokenAmounts[_i] * -1), "INSUFFICIENT_BALANCE");
            tokenHoldings[msg.sender][_positionId] = tokenHoldings[msg.sender][_positionId] - uint(_outcomeTokenAmounts[_i] * -1);
        }
        emit Trade(_conditionId, _outcomeTokenAmounts, msg.sender, getTimestamp64());
        int _netCost = marketData[_conditionId].marketMaker.trade(_outcomeTokenAmounts, _collateralLimit);
        require(_netCost < 0, "INCONSISTENT_NET_COST");
        weth9Token.transfer(msg.sender, uint(_netCost * - 1));
    }

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        return interfaceId == this.onERC1155Received.selector ^ this.onERC1155BatchReceived.selector;
    }

    function onERC1155Received(address, address, uint256 _id, uint256 _value, bytes) external returns(bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] _ids, uint256[] _values, bytes) external returns(bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    /**
      * @notice Close a prediction market
      */
    function closeMarket(
            uint[] _payouts,
            bytes32 _conditionId,
            bytes32 _questionId) external auth(CLOSE_MARKET_ROLE) requiresMarketData(_conditionId) returns (int) {
        MarketData storage data = marketData[_conditionId];
        require(data.oracle == msg.sender, "INVALID_ORACLE");
        uint[] memory _marginalPricesAtClosure = new uint[](_payouts.length);
        for(uint8 _i = 0; _i < _payouts.length; _i++) {
            _marginalPricesAtClosure[_i] = this.getMarginalPrice(_conditionId, _i);
        }
        data.marketMaker.close();
        conditionalTokens.reportPayouts(_questionId, _payouts);
        emit CloseMarket(_conditionId, _payouts, getTimestamp64(), _marginalPricesAtClosure);
    }

    /**
      * @notice Redeem position on a closed prediction market
      */
    function redeemPositions(uint[] _indexSets, bytes32 _conditionId) external {
        conditionalTokens.redeemPositions(weth9Token, bytes32(""), _conditionId, _indexSets);
        uint totalPayout = 0;
        uint den = conditionalTokens.payoutDenominator(_conditionId);
        for (uint i = 0; i < _indexSets.length; i++) {
            uint indexSet = _indexSets[i];
            uint payoutNumerator = 0;
            for (uint j = 0; j < _indexSets.length; j++) {
                if (indexSet & (1 << j) != 0) {
                    payoutNumerator = payoutNumerator.add(conditionalTokens.payoutNumerators(_conditionId,j));
                }
            }
            uint _positionId = this.getPositionId(
                weth9Token,
                this.getCollectionId(bytes32(""), _conditionId, i + 1)
            );
            uint payoutStake = tokenHoldings[msg.sender][_positionId];
            if (payoutStake > 0) {
                totalPayout = totalPayout.add(payoutStake.mul(payoutNumerator).div(den));
                tokenHoldings[msg.sender][_positionId] = 0;
            }
        }
        weth9Token.transfer(msg.sender, totalPayout);
        emit RedeemPositions(msg.sender, _conditionId);
    }
}
