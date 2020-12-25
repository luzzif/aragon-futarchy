pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "./Abstraction.sol";
import "./ERC1155Receiver.sol";
import "./Helpers.sol";

contract FutarchyApp is AragonApp, ERC1155Receiver, Helpers {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

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
        address collateralToken,
        uint timestamp,
        bytes32 conditionId,
        bytes32[] outcomes
    );
    event CloseMarket(bytes32 conditionId, uint[] marginalPricesAtClosure, uint[] payouts, uint timestamp);

    struct MarketData {
        ERC20 collateralToken;
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
    Realitio public realitio;
    uint32 public realitioTimeout;
    address public arbitratorAddress;
    mapping(bytes32 => MarketData) public marketData;

    function initialize(
        address _conditionalTokensAddress,
        address _marketMakerFactoryAddress,
        address _realitioAddress,
        uint32 _realitioTimeout,
        address _arbitratorAddress
    ) public onlyInit {
        conditionalTokens = IConditionalTokens(_conditionalTokensAddress);
        lmsrMarketMakerFactory = ILMSRMarketMakerFactory(_marketMakerFactoryAddress);
        realitio = Realitio(_realitioAddress);
        realitioTimeout = _realitioTimeout;
        arbitratorAddress = _arbitratorAddress;
        initialized();
    }

    /**
      * @notice Create a prediction market
      */
    function createMarket(
            address _collateralTokenAddress,
            uint _collateralAmount,
            string _question,
            bytes32[] _outcomes,
            uint32 _endsAt,
            string _realitioQuestion) external payable auth(CREATE_MARKET_ROLE) {
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
        ILMSRMarketMaker _marketMaker = ILMSRMarketMaker(
            setupMarketMaker(
                _conditionId,
                _collateralTokenAddress,
                _collateralAmount
            )
        );
        conditionalTokens.setApprovalForAll(address(_marketMaker), true);
        bytes32 _realitioQuestionId = realitio.askQuestion(
            2,
            _realitioQuestion,
            arbitratorAddress,
            realitioTimeout,
            _endsAt,
            0
        );
        marketData[_conditionId] = MarketData({
            collateralToken: ERC20(_collateralTokenAddress),
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
            _collateralTokenAddress,
            getTimestamp64(),
            _conditionId,
            _outcomes
        );
    }

    function setupMarketMaker(
            bytes32 _conditionId,
            address _collateralTokenAddress,
            uint _collateralAmount) private returns(address) {
        ERC20 _collateralToken = ERC20(_collateralTokenAddress);
        _collateralToken.approve(lmsrMarketMakerFactory, _collateralAmount);
        _collateralToken.safeTransferFrom(msg.sender, address(this), _collateralAmount);
        _collateralToken.safeTransferFrom(msg.sender, address(this), _collateralAmount);
        bytes32[] memory _conditionIds = new bytes32[](1);
        _conditionIds[0] = _conditionId;
        ILMSRMarketMaker _marketMaker = lmsrMarketMakerFactory.createLMSRMarketMaker(
            conditionalTokens,
            ERC20(_collateralTokenAddress),
            _conditionIds,
            0,
            address(0),
            _collateralAmount
        );
        return address(_marketMaker);
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
        ERC20 _collateralToken = marketData[_conditionId].collateralToken;

        int[] memory _intOutcomeTokensAmount = uintArrayToIntArray(_outcomeTokensAmount);
        int _netCollateralCost = _marketMaker.trade(_intOutcomeTokensAmount, _collateralLimit);
        conditionalTokens.safeBatchTransferFrom(
            address(this),
            msg.sender,
            getAllPositionIds(conditionalTokens, _conditionId, _marketMaker, _collateralToken),
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
    function sell(bytes32 _conditionId, uint[] _outcomeTokensAmount, uint _minimumCollateralBack)
            external
            payable
            auth(TRADE_ROLE)
            requiresApproval
            requiresMarketData(_conditionId) {
        require(marketData[_conditionId].endsAt >= getTimestamp64(), "EXPIRED_MARKET");
        ILMSRMarketMaker _marketMaker = marketData[_conditionId].marketMaker;
        require(_marketMaker.atomicOutcomeSlotCount() == _outcomeTokensAmount.length, "INCONSISTENT_OUTCOMES_LENGTH");
        ERC20 _collateralToken = marketData[_conditionId].collateralToken;
        int[] memory _intOutcomeTokenAmounts = handleSellTokenTransfer(
            _conditionId,
            _outcomeTokensAmount,
            _marketMaker,
            _collateralToken
        );
        int _netCollateralCost = _marketMaker.trade(_intOutcomeTokenAmounts, -int(_minimumCollateralBack));
        require(_netCollateralCost < 0, "INCONSISTENT_NET_COST");
        _collateralToken.transfer(msg.sender, uint(-_netCollateralCost));
        emit Trade(
            _conditionId,
            _intOutcomeTokenAmounts,
            msg.sender,
            getTimestamp64(),
            _netCollateralCost
        );
    }

    function handleSellTokenTransfer(
            bytes32 _conditionId,
            uint[] _outcomeTokensAmount,
            ILMSRMarketMaker _marketMaker,
            ERC20 _collateralToken) private returns(int[]) {
        uint[] memory _positionIds = getAllPositionIds(
            conditionalTokens,
            _conditionId,
            _marketMaker,
            _collateralToken
        );
        int[] memory _intOutcomeTokenAmounts = new int[](_outcomeTokensAmount.length);
        for(uint _i; _i < _outcomeTokensAmount.length; _i++) {
            uint _outcomeTokenAmount = _outcomeTokensAmount[_i];
            _intOutcomeTokenAmounts[_i] = -int(_outcomeTokenAmount);
        }
        conditionalTokens.safeBatchTransferFrom(msg.sender, address(this), _positionIds, _outcomeTokensAmount, "");
        return _intOutcomeTokenAmounts;
    }

    /**
      * @notice Close the prediction market
      */
    function closeMarket(bytes32 _conditionId) external auth(CLOSE_MARKET_ROLE) requiresMarketData(_conditionId) {
        MarketData storage _marketData = marketData[_conditionId];
        require(_marketData.endsAt <= getTimestamp64(), "ONGOING_MARKET");
        bytes32 _realitioQuestionId = _marketData.realitioQuestionId;
        require(realitio.isFinalized(_realitioQuestionId), "NOT_FINALIZED");
        uint _rightOutcomeIndex = uint(realitio.resultFor(_realitioQuestionId));
        bool _invalidQuestion = _rightOutcomeIndex > _marketData.outcomesAmount;
        uint[] memory _payouts = new uint[](_marketData.outcomesAmount);
        uint[] memory _marginalPricesAtClosure = new uint[](_marketData.outcomesAmount);
        for (uint _i = 0; _i < _marketData.outcomesAmount; _i++) {
            _marginalPricesAtClosure[_i] = _marketData.marketMaker.calcMarginalPrice(uint8(_i));
            if(_invalidQuestion) {
                _payouts[_i] = 1;
            } else {
                _payouts[_i] = _i == _rightOutcomeIndex ? 1 : 0;
            }
        }
        _marketData.marketMaker.close();
        conditionalTokens.reportPayouts(_marketData.questionId, _payouts);
        emit CloseMarket(_conditionId, _marginalPricesAtClosure, _payouts, getTimestamp64());
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
