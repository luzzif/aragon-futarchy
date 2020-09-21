pragma solidity ^0.4.24;

import "./Abstraction.sol";

contract ERC1155Receiver is IERC1155Receiver {
    function onERC1155Received(
            address _operator,
            address _from,
            uint256 _id,
            uint256 _value,
            bytes _data) external returns(bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
            address _operator,
            address _from,
            uint256[] _ids,
            uint256[] _values,
            bytes _data) external returns(bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        return interfaceId == this.onERC1155Received.selector ^ this.onERC1155BatchReceived.selector;
    }
}