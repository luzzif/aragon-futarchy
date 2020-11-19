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

interface IRealitio {
    function askQuestion(
        uint256 templateId,
        string question,
        address arbitrator,
        uint32 timeout,
        uint32 openingTimestamp,
        uint256 nonce
    ) external payable returns (bytes32 questionId);
    function notifyOfArbitrationRequest(bytes32 questionId, address requester, uint256 maxPrevious) external;
    function submitAnswerByArbitrator(bytes32 questionId, bytes32 answer, address answerer) external;
    function getHistoryHash(bytes32 questionId) external returns(bytes32);
    function commitments(bytes32 commitmentId) external returns(uint32, bool, bytes32);
    function isFinalized(bytes32 questionId) external view returns (bool);
    function resultFor(bytes32 questionId) external view returns (bytes32);
}

// Kleros contracts as seen in https://github.com/kleros/kleros-interaction

interface IArbitrable {
    event MetaEvidence(uint indexed _metaEvidenceID, string _evidence);
    event Dispute(Arbitrator indexed _arbitrator, uint indexed _disputeID, uint _metaEvidenceID, uint _evidenceGroupID);
    event Evidence(Arbitrator indexed _arbitrator, uint indexed _evidenceGroupID, address indexed _party, string _evidence);
    event Ruling(Arbitrator indexed _arbitrator, uint indexed _disputeID, uint _ruling);
    function rule(uint _disputeID, uint _ruling) external;
}

contract Arbitrator {
    enum DisputeStatus {Waiting, Appealable, Solved}

    modifier requireArbitrationFee(bytes _extraData) {
        require(msg.value >= arbitrationCost(_extraData), "Not enough ETH to cover arbitration costs.");
        _;
    }

    modifier requireAppealFee(uint _disputeID, bytes _extraData) {
        require(msg.value >= appealCost(_disputeID, _extraData), "Not enough ETH to cover appeal costs.");
        _;
    }

    event DisputeCreation(uint indexed _disputeID, Arbitrable indexed _arbitrable);
    event AppealPossible(uint indexed _disputeID, Arbitrable indexed _arbitrable);
    event AppealDecision(uint indexed _disputeID, Arbitrable indexed _arbitrable);

    function createDispute(uint _choices, bytes _extraData) public requireArbitrationFee(_extraData) payable returns(uint disputeID) {}

    function arbitrationCost(bytes _extraData) public view returns(uint fee);

    function appeal(uint _disputeID, bytes _extraData) public requireAppealFee(_disputeID,_extraData) payable {
        emit AppealDecision(_disputeID, Arbitrable(msg.sender));
    }

    function appealCost(uint _disputeID, bytes _extraData) public view returns(uint fee);

    function appealPeriod(uint _disputeID) public view returns(uint start, uint end) {}

    function disputeStatus(uint _disputeID) public view returns(DisputeStatus status);

    function currentRuling(uint _disputeID) public view returns(uint ruling);
}

// Used for testing purposes only
contract CentralizedArbitrator is Arbitrator {
    address public owner = msg.sender;
    uint arbitrationPrice;
    uint constant NOT_PAYABLE_VALUE = (2**256-2)/2;

    struct DisputeStruct {
        Arbitrable arbitrated;
        uint choices;
        uint fee;
        uint ruling;
        DisputeStatus status;
    }

    modifier onlyOwner {require(msg.sender==owner, "Can only be called by the owner."); _;}

    DisputeStruct[] public disputes;

    constructor(uint _arbitrationPrice) public {
        arbitrationPrice = _arbitrationPrice;
    }

    function setArbitrationPrice(uint _arbitrationPrice) public onlyOwner {
        arbitrationPrice = _arbitrationPrice;
    }

    function arbitrationCost(bytes _extraData) public view returns(uint fee) {
        return arbitrationPrice;
    }

    function appealCost(uint _disputeID, bytes _extraData) public view returns(uint fee) {
        return NOT_PAYABLE_VALUE;
    }

    function createDispute(uint _choices, bytes _extraData) public payable returns(uint disputeID)  {
        super.createDispute(_choices, _extraData);
        disputeID = disputes.push(DisputeStruct({
            arbitrated: Arbitrable(msg.sender),
            choices: _choices,
            fee: msg.value,
            ruling: 0,
            status: DisputeStatus.Waiting
            })) - 1; // Create the dispute and return its number.
        emit DisputeCreation(disputeID, Arbitrable(msg.sender));
    }

    function _giveRuling(uint _disputeID, uint _ruling) internal {
        DisputeStruct storage dispute = disputes[_disputeID];
        require(_ruling <= dispute.choices, "Invalid ruling.");
        require(dispute.status != DisputeStatus.Solved, "The dispute must not be solved already.");

        dispute.ruling = _ruling;
        dispute.status = DisputeStatus.Solved;

        msg.sender.send(dispute.fee); // Avoid blocking.
        dispute.arbitrated.rule(_disputeID,_ruling);
    }

    function giveRuling(uint _disputeID, uint _ruling) public onlyOwner {
        return _giveRuling(_disputeID, _ruling);
    }

    function disputeStatus(uint _disputeID) public view returns(DisputeStatus status) {
        return disputes[_disputeID].status;
    }

    function currentRuling(uint _disputeID) public view returns(uint ruling) {
        return disputes[_disputeID].ruling;
    }
}

contract Arbitrable is IArbitrable {
    Arbitrator public arbitrator;
    bytes public arbitratorExtraData;

    modifier onlyArbitrator {
        require(msg.sender == address(arbitrator), "Can only be called by the arbitrator."); _;
    }

    constructor(Arbitrator _arbitrator, bytes _arbitratorExtraData) public {
        arbitrator = _arbitrator;
        arbitratorExtraData = _arbitratorExtraData;
    }

    function rule(uint _disputeID, uint _ruling) public onlyArbitrator {
        emit Ruling(Arbitrator(msg.sender),_disputeID,_ruling);

        executeRuling(_disputeID,_ruling);
    }

    function executeRuling(uint _disputeID, uint _ruling) internal;
}

contract RealitioArbitratorProxy is Arbitrable {
    event DisputeIDToQuestionID(uint indexed _disputeID, bytes32 _questionID);

    uint public constant NUMBER_OF_CHOICES_FOR_ARBITRATOR = (2 ** 256) - 2;
    address public deployer;
    IRealitio public realitio;
    mapping(uint => bytes32) public disputeIDToQuestionID;
    mapping(bytes32 => address) public questionIDToDisputer;
    mapping(bytes32 => bytes32) public questionIDToAnswer;
    mapping(bytes32 => bool) public questionIDToRuled;

    constructor(
        Arbitrator _arbitrator,
        bytes _arbitratorExtraData,
        IRealitio _realitio
    ) Arbitrable(_arbitrator, _arbitratorExtraData) public {
        deployer = msg.sender;
        realitio = _realitio;
    }

    function setMetaEvidence(string _metaEvidence) external {
        require(msg.sender == deployer, "Can only be called once by the deployer of the contract.");
        deployer = address(0);
        emit MetaEvidence(0, _metaEvidence);
    }

    function requestArbitration(bytes32 _questionID, uint _maxPrevious) external payable {
        uint disputeID = arbitrator.createDispute.value(msg.value)(NUMBER_OF_CHOICES_FOR_ARBITRATOR, arbitratorExtraData);
        disputeIDToQuestionID[disputeID] = _questionID;
        questionIDToDisputer[_questionID] = msg.sender;
        realitio.notifyOfArbitrationRequest(_questionID, msg.sender, _maxPrevious);
        emit Dispute(arbitrator, disputeID, 0, 0);
        emit DisputeIDToQuestionID(disputeID, _questionID);
    }

    function reportAnswer(
        bytes32 _questionID,
        bytes32 _lastHistoryHash,
        bytes32 _lastAnswerOrCommitmentID,
        uint _lastBond,
        address _lastAnswerer,
        bool _isCommitment
    ) external {
        require(
            realitio.getHistoryHash(_questionID) == keccak256(_lastHistoryHash, _lastAnswerOrCommitmentID, _lastBond, _lastAnswerer, _isCommitment),
            "The hash of the history parameters supplied does not match the one stored in the Realitio contract."
        );
        require(questionIDToRuled[_questionID], "The arbitrator has not ruled yet.");

        realitio.submitAnswerByArbitrator(
            _questionID,
            questionIDToAnswer[_questionID],
            computeWinner(_questionID, _lastAnswerOrCommitmentID, _lastBond, _lastAnswerer, _isCommitment)
        );

        delete questionIDToDisputer[_questionID];
        delete questionIDToAnswer[_questionID];
        delete questionIDToRuled[_questionID];
    }

    function getDisputeFee(bytes32 _questionID) external view returns (uint fee) {
        return arbitrator.arbitrationCost(arbitratorExtraData);
    }

    function executeRuling(uint _disputeID, uint _ruling) internal {
        questionIDToAnswer[disputeIDToQuestionID[_disputeID]] = bytes32(_ruling == 0 ? uint(-1) : _ruling - 1);
        questionIDToRuled[disputeIDToQuestionID[_disputeID]] = true;
        delete disputeIDToQuestionID[_disputeID];
    }

    function computeWinner(
        bytes32 _questionID,
        bytes32 _lastAnswerOrCommitmentID,
        uint _lastBond,
        address _lastAnswerer,
        bool _isCommitment
    ) private view returns(address winner) {
        bytes32 lastAnswer;
        bool isAnswered;
        if (_lastBond == 0) { // If the question hasn't been answered, nobody is ever right.
            isAnswered = false;
        } else if (_isCommitment) {
            (uint32 revealTS, bool isRevealed, bytes32 revealedAnswer) = realitio.commitments(_lastAnswerOrCommitmentID);
            if (isRevealed) {
                lastAnswer = revealedAnswer;
                isAnswered = true;
            } else {
                require(revealTS <= uint32(now), "Arbitration cannot be done until the last answerer has had time to reveal its commitment.");
                isAnswered = false;
            }
        } else {
            lastAnswer = _lastAnswerOrCommitmentID;
            isAnswered = true;
        }

        return isAnswered && lastAnswer == questionIDToAnswer[_questionID] ? _lastAnswerer : questionIDToDisputer[_questionID];
    }
}
