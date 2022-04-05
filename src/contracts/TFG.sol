// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../ERC1155/ERC1155.sol";
import "../ERC1155/utils/ERC1155Holder.sol";
import "../ERC1155/utils/access/Ownable.sol";



contract TFG is ERC1155, ERC1155Holder, Ownable{
    address public admin;
    address public addressC;
    uint256 public count;

    //ids para los tokens
    uint256 public constant moneda = 0;

    //estructuras auxiliares
    string [] public docs;
    mapping (uint256 => address) _seller;
    mapping (string => bool) _docExists;
    mapping (uint256 => uint) _price;
    mapping (uint256 => address) _property;


    string ipfsHash;

    constructor() ERC1155("") {
        addressC = address(this);
        admin = msg.sender;
        count = 1;
       _mint(msg.sender, moneda, 100, "");
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, ERC1155Receiver)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
 
    function sendHash(string memory x, uint precio) public {
        require(!_docExists[x]);
        ipfsHash = x;
        docs.push(x);
        _price[count] = precio;
        _property[count] = msg.sender;
        bytes memory dataColor = bytes(x);
        _mint(msg.sender, count, 1, dataColor);
        count++;
        _docExists[x] = true;
    }

    function getHash() public view returns (string memory x) {
    return ipfsHash;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin can call this");
        _;
    }

    



    /*function nuevoDoc(string memory _ipfsHash, uint precio) public{
        require(!_colorExists[_ipfsHash]);
        docs.push(_ipfsHash);
        _price[count] = precio;
        _property[count] = msg.sender;
        bytes memory dataColor = bytes(_ipfsHash);
        _mint(msg.sender, count, 1, dataColor);
        count++;
        _colorExists[_ipfsHash] = true;
        
    }*/

    function totalSupply() public view returns (uint256){
        return docs.length;
    }

    function property(uint256 id) public view returns (address){
        return _property[id];
    }

    function funds(address propietario) public view returns (uint256){
        return balanceOf(propietario, 0);
    }

    function price(uint256 id) public view returns (uint256){
        return _price[id];
    }

    function addFunds() public payable onlyAdmin{
        _mint(msg.sender, 0, 100, "");
    }


    function buy(uint tokenId) public payable {
        //Ahora la transacción de las monedas
        safeTransferFrom(msg.sender, _seller[tokenId+1], 0, _price[tokenId+1], "");
        _safeTransferFrom(_property[tokenId+1], msg.sender, tokenId+1, 1, "");
        _property[tokenId+1] = msg.sender;
    }

    function permission(uint256 tokenId) public {
        _seller[tokenId + 1] = _property[tokenId+1];
        _property[tokenId+1] = address(this);
        safeTransferFrom(msg.sender, _property[tokenId+1], tokenId + 1, 1, "");
    }

    function updatePrice(uint newPrice, uint256 tokenId) public {
        _price[tokenId+1] = newPrice;
    }

}