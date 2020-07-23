pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

interface IConditionalTokens {
    function prepareCondition(
        address _oracle,
        bytes32 _questionId,
        uint _outcomesAmount
    ) external;
}

contract PredictionMarketsApp is AragonApp {
    using SafeMath for uint256;

    /// ACL
    bytes32 constant public CREATE_MARKET_ROLE = keccak256("CREATE_MARKET_ROLE");

    /// Events
    event CreateMarket(
        address indexed creator,
        bytes32 indexed questionId,
        uint outcomesAmount,
        bytes32 question,
        bytes32[] outcomes
    );

    IConditionalTokens public conditionalTokens;

    function initialize(address _conditionalTokensAddress) public onlyInit {
        conditionalTokens = IConditionalTokens(_conditionalTokensAddress);
        initialized();
    }

    function createMarket(
            bytes32 _questionId,
            uint _outcomesAmount,
            bytes32 _question,
            bytes32[] _outcomes) external auth(CREATE_MARKET_ROLE) {
        // conditionalTokens.prepareCondition(_oracle, _questionId, _outcomesAmount);
        emit CreateMarket(msg.sender, _questionId, _outcomesAmount, _question, _outcomes);
    }
}
