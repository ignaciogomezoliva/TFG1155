// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import {ERC1155} from "../../node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "../../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract TFG is ERC1155, Ownable{
    constructor() TFG("") {}

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function mint (address account, uint256 id, uint256 amount, bytes memory data) public onlyOwner(){
        _mint(account, id, amount, data);
    }

}