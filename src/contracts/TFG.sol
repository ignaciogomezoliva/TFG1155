// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../ERC1155/ERC1155.sol";

contract TFG is ERC1155{
    address public admin;
    uint256 public count;

    //ids para los tokens
    uint256 public constant moneda = 0;

    //estructuras auxiliares
    string [] public colors;
    mapping (string => bool) _colorExists;

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin can call this");
        _;
    }

    constructor() public ERC1155("") {
        admin = msg.sender;
        count = 1;
        _mint(msg.sender, moneda, 100, "");

    }

    function nuevoColor(string memory _color) public{
        require(!_colorExists[_color]);
        colors.push(_color);
        bytes memory dataColor = bytes(_color);
        
        _mint(msg.sender, count++, 1, dataColor);
        _colorExists[_color] = true;
    }

    function totalSupply() public view returns (uint256){
        return count;
    }
}