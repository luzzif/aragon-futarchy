pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "./Abstraction.sol";
import "./ERC1155Receiver.sol";
import "./Helpers.sol";

contract PredictionMarketsApp is AragonApp, ERC1155Receiver, Helpers {
    using SafeMath for uint256;

    /// ACL
    bytes32 constant public CREATE_MARKET_ROLE = keccak256("CREATE_MARKET_ROLE");
    bytes32 constant public TRADE_ROLE = keccak256("TRADE_ROLE");
    bytes32 constant public CLOSE_MARKET_ROLE = keccak256("CLOSE_MARKET_ROLE");

    /// Events
    event Trade(
        bytes32 conditionId,
        int[] outcomeTokenAmounts,
        address transactor,
        uint timestamp,
        int netCollateralCost
    );
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
    mapping(address => mapping(bytes32 => bool)) public redeemedPositions;

    modifier requiresMarketData(bytes32 _conditionId) {
        require(marketData[_conditionId].exists, "NON_EXISTENT_CONDITION");
        _;
    }

    modifier requiresApproval() {
        require(conditionalTokens.isApprovedForAll(msg.sender, address(this)), "ABSENT_APPROVAL");
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
        weth9Token.deposit.value(msg.value)();
        weth9Token.approve(address(lmsrMarketMakerFactory), msg.value);
        conditionalTokens.prepareCondition(address(this), _questionId, _outcomesAmount);
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

    /**
      * @notice Buy outcome shares.
      */
    function buy(bytes32 _conditionId, uint[] _outcomeTokensAmount, int _collateralLimit)
            external
            payable
            auth(TRADE_ROLE)
            requiresMarketData(_conditionId) {
        require(msg.value >= uint(_collateralLimit), "NOT_ENOUGH_COLLATERAL");
        require(marketData[_conditionId].endsAt >= getTimestamp64(), "EXPIRED_MARKET");
        ILMSRMarketMaker _marketMaker = marketData[_conditionId].marketMaker;

        weth9Token.deposit.value(msg.value)();
        weth9Token.approve(address(_marketMaker), msg.value);

        int[] memory _intOutcomeTokensAmount = uintArrayToIntArray(_outcomeTokensAmount);
        int _netCollateralCost = _marketMaker.trade(_intOutcomeTokensAmount, _collateralLimit);
        conditionalTokens.safeBatchTransferFrom(
            address(this),
            msg.sender,
            getAllPositionIds(conditionalTokens, _conditionId, _marketMaker, weth9Token),
            _outcomeTokensAmount,
            ""
        );

        emit Trade(
            _conditionId,
            _intOutcomeTokensAmount,
            msg.sender,
            getTimestamp64(),
            _netCollateralCost
        );
    }

    /**
      * @notice Sell outcome shares
      */
    function sell(bytes32 _conditionId, uint[] _outcomeTokensAmount)
            external
            payable
            auth(TRADE_ROLE)
            requiresApproval
            requiresMarketData(_conditionId) {
        require(marketData[_conditionId].endsAt >= getTimestamp64(), "EXPIRED_MARKET");
        ILMSRMarketMaker _marketMaker = marketData[_conditionId].marketMaker;
        require(_marketMaker.atomicOutcomeSlotCount() == _outcomeTokensAmount.length, "INCONSISTENT_OUTCOMES_LENGTH");
        uint[] memory _positionIds = getAllPositionIds(conditionalTokens, _conditionId, _marketMaker, weth9Token);

        // check if the user has enough ct balance, and if they have, take ownership
        // of the sold amount and actually sell it. Plus, outcome amounts are passed
        // in as positive numbers by default, so in order to signal a selling operation
        // to the market maker, we need to negate the passed amounts.
        int[] memory _intOutcomeTokenAmounts = new int[](_outcomeTokensAmount.length);
        for(uint _i; _i < _outcomeTokensAmount.length; _i++) {
            uint _outcomeTokenAmount = _outcomeTokensAmount[_i];
            /* require(
                conditionalTokens.balanceOf(msg.sender, _positionIds[_i]) >= _outcomeTokenAmount,
                "NOT_ENOUGH_BALANCE"
            ); */
            _intOutcomeTokenAmounts[_i] = -int(_outcomeTokenAmount);
        }
        conditionalTokens.safeBatchTransferFrom(msg.sender, address(this), _positionIds, _outcomeTokensAmount, "");
        int _netCollateralCost = _marketMaker.trade(_intOutcomeTokenAmounts, 0);
        require(_netCollateralCost < 0, "INCONSISTENT_NET_COST");
        weth9Token.transfer(msg.sender, uint(-_netCollateralCost));
        emit Trade(
            _conditionId,
            _intOutcomeTokenAmounts,
            msg.sender,
            getTimestamp64(),
            _netCollateralCost
        );
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
            _marginalPricesAtClosure[_i] = data.marketMaker.calcMarginalPrice(_i);
        }
        data.marketMaker.close();
        conditionalTokens.reportPayouts(_questionId, _payouts);
        emit CloseMarket(_conditionId, _payouts, getTimestamp64(), _marginalPricesAtClosure);
    }

    /**
      * @notice Redeem position on a closed prediction market
      */
    function redeemPositions(uint[] _indexSets, bytes32 _conditionId) external {
        /* conditionalTokens.redeemPositions(weth9Token, bytes32(""), _conditionId, _indexSets);
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
            uint _positionId = conditionalTokens.getPositionId(
                weth9Token,
                conditionalTokens.getCollectionId(bytes32(""), _conditionId, i + 1)
            );
            uint payoutStake = tokenHoldings[msg.sender][_positionId];
            if (payoutStake > 0) {
                totalPayout = totalPayout.add(payoutStake.mul(payoutNumerator).div(den));
                tokenHoldings[msg.sender][_positionId] = 0;
            }
        }
        weth9Token.transfer(msg.sender, totalPayout);
        emit RedeemPositions(msg.sender, _conditionId); */
    }
}
