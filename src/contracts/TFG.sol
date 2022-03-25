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
    mapping (uint => uint256) _price;
    mapping (uint => address) _property;

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin can call this");
        _;
    }

    constructor() public ERC1155("") {
        admin = msg.sender;
        count = 1;
       _mint(msg.sender, moneda, 100, "");
    }

    function nuevoColor(string memory _color, uint precio) public{
        require(!_colorExists[_color]);
        colors.push(_color);
        _price[count] = precio;
        _property[count] = msg.sender;
        bytes memory dataColor = bytes(_color);
        _mint(msg.sender, count, 1, dataColor);
        count++;
        _colorExists[_color] = true;
        
    }

    function totalSupply() public view returns (uint256){
        return colors.length;
    }

    function property(address propietario, uint id) public view returns (uint256){
        return balanceOf(propietario, id);
    }

    function funds(address propietario) public view returns (uint256){
        return balanceOf(propietario, 0);
    }

    function addFunds() public payable onlyAdmin{
        _mint(msg.sender, 0, 100, "");
    }


    function buy(string memory color) public {
        //primero necesito encontrar el id del token a comprar y su propietario
        bool encontrado = false;
        address to;
        uint i = 1;
        while (!encontrado && i<colors.length){
            if (compareStrings(color, colors[i])) {
                encontrado = true;
                to = _property[i];
            }
        }
        require(encontrado);

        //Ahora la transacción de las monedas
        require(_price[i] >= balanceOf(msg.sender, 0));
        safeTransferFrom(msg.sender, to, 1, _price[i], "");

        safeTransferFrom(to, msg.sender, i, 1, "");

    }

    function compareStrings(string memory a, string memory b) public pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

}