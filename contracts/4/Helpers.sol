pragma solidity ^0.4.24;

import "./Abstraction.sol";

contract Helpers {
    function getAllPositionIds(
            IConditionalTokens _conditionalTokens,
            bytes32 _conditionId,
            ILMSRMarketMaker _marketMaker,
            ERC20 _collateralToken) internal view returns (uint[]) {
        uint[] memory _positionIds = new uint[](_marketMaker.atomicOutcomeSlotCount());
        for(uint _i; _i < _positionIds.length; _i++) {
            _positionIds[_i] = _conditionalTokens.getPositionId(
                _collateralToken,
                _conditionalTokens.getCollectionId(bytes32(""), _conditionId, _i + 1)
            );
        }
        return _positionIds;
    }

    function uintArrayToIntArray(uint[] _uintArray) internal pure returns (int[]) {
        int[] memory _converted = new int[](_uintArray.length);
        for(uint _i; _i < _uintArray.length; _i++) {
            _converted[_i] = int(_uintArray[_i]);
        }
        return _converted;
    }
}