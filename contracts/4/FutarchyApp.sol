pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "./Abstraction.sol";
import "./ERC1155Receiver.sol";
import "./Helpers.sol";

contract FutarchyApp is AragonApp, ERC1155Receiver, Helpers {
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
    event CreateMarket(
        address creator,
        uint timestamp,
        bytes32 conditionId,
        bytes32[] outcomes
    );
    event CloseMarket(bytes32 conditionId, uint[] payouts, uint timestamp);

    struct MarketData {
        ILMSRMarketMaker marketMaker;
        string question;
        bytes32 questionId;
        bytes32 realitioQuestionId;
        uint outcomesAmount;
        uint32 endsAt;
        bool exists;
    }

    IConditionalTokens public conditionalTokens;
    ILMSRMarketMakerFactory public lmsrMarketMakerFactory;
    IWETH9 public weth9Token;
    Realitio public realitio;
    address public klerosArbitratorAddress;
    mapping(bytes32 => MarketData) public marketData;

    function initialize(
        address _conditionalTokensAddress,
        address _marketMakerFactoryAddress,
        address _weth9TokenAddress,
        address _realitioAddress,
        address _klerosArbitratorAddress
    ) public onlyInit {
        conditionalTokens = IConditionalTokens(_conditionalTokensAddress);
        lmsrMarketMakerFactory = ILMSRMarketMakerFactory(_marketMakerFactoryAddress);
        weth9Token = IWETH9(_weth9TokenAddress);
        realitio = Realitio(_realitioAddress);
        klerosArbitratorAddress = _klerosArbitratorAddress;
        initialized();
    }

    /**
      * @notice Create a prediction market
      */
    function createMarket(
            string _question,
            bytes32[] _outcomes,
            uint32 _endsAt,
            string _realitioQuestion,
            uint32 _realitioTimeout) external payable auth(CREATE_MARKET_ROLE) {
        weth9Token.deposit.value(msg.value)();
        weth9Token.approve(address(lmsrMarketMakerFactory), msg.value);
        conditionalTokens.prepareCondition(
            address(this),
            keccak256(abi.encodePacked(_endsAt)),
            _outcomes.length
        );
        bytes32 _conditionId = conditionalTokens.getConditionId(
            address(this),
            keccak256(abi.encodePacked(_endsAt)),
            _outcomes.length
        );
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
        // FIXME: use proper values here
        bytes32 _realitioQuestionId = realitio.askQuestion(
            2,
            _realitioQuestion,
            klerosArbitratorAddress,
            _realitioTimeout,
            _endsAt,
            0
        );
        marketData[_conditionId] = MarketData({
            marketMaker: _marketMaker,
            exists: true,
            outcomesAmount: _outcomes.length,
            endsAt: _endsAt,
            questionId: keccak256(abi.encodePacked(_endsAt)),
            realitioQuestionId: _realitioQuestionId,
            question: _question
        });
        emit CreateMarket(
            msg.sender,
            getTimestamp64(),
            _conditionId,
            _outcomes
        );
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
      * @notice Close the prediction market
      */
    function closeMarket(bytes32 _conditionId) external auth(CLOSE_MARKET_ROLE) requiresMarketData(_conditionId) {
        MarketData _marketData = marketData[_conditionId];
        require(_marketData.endsAt <= getTimestamp64(), "ONGOING_MARKET");
        bytes32 _realitioQuestionId = _marketData.realitioQuestionId;
        require(realitio.isFinalized(_realitioQuestionId), "NOT_FINALIZED");
        uint _rightOutcomeIndex = uint(realitio.resultFor(_realitioQuestionId));
        uint[] memory _payouts = new uint[](_marketData.outcomesAmount);
        for (uint _i = 0; _i < _marketData.outcomesAmount; _i++) {
            _payouts[_i] = _i == _rightOutcomeIndex ? 1 : 0;
        }
        _marketData.marketMaker.close();
        conditionalTokens.reportPayouts(_marketData.questionId, _payouts);
        emit CloseMarket(_conditionId, _payouts, getTimestamp64());
    }

    /// Modifiers

    modifier requiresMarketData(bytes32 _conditionId) {
        require(marketData[_conditionId].exists, "NON_EXISTENT_CONDITION");
        _;
    }

    modifier requiresApproval() {
        require(conditionalTokens.isApprovedForAll(msg.sender, address(this)), "ABSENT_APPROVAL");
        _;
    }
}
