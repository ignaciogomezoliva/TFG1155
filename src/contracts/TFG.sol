// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./ERC1155/ERC1155.sol";
import "./ERC1155/utils/ERC1155Holder.sol";
import "./ERC1155/utils/access/Ownable.sol";



contract TFG is ERC1155, ERC1155Holder, Ownable{
    address public admin;
    address public addressC;
    uint256 public count;

    uint256 public constant moneda = 0;

    //estructuras auxiliares
    string [] public docs;
    mapping (string => address) _seller;
    mapping (string => bool) _docExists;
    mapping (string => uint) _price;
    mapping (string => address) _property;
    mapping (string => string) _titles;
    mapping (string => uint) _ids;
    mapping (string => string) _descriptions;

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
 
    function sendHash(string memory x, uint precio, string memory titulo, string memory description) public {
        require(!_docExists[x]);
        ipfsHash = x;
        docs.push(x);
        _ids[x] = count;
        _price[x] = precio;
        _property[x] = msg.sender;
        _titles[x] = titulo;
        _descriptions[x] = description;
        bytes memory dataDoc = bytes(x);
        _mint(msg.sender, count, 1, dataDoc);
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

    function totalSupply() public view returns (uint256){
        return docs.length;
    }

    function getProperty(string memory id) public view returns (address){
        return _property[id];
    }

    function update(string memory id, string memory newDescription, uint256 newPrice) public {
        _descriptions[id] = newDescription;
        _price[id] = newPrice;
    }

    function getTitle(string memory id) public view returns(string memory title){
        return _titles[id];
    }

    function setTitle(string memory id, string memory newTitle) public {
        _titles[id] = newTitle;
    }

    function getPrice(string memory id) public view returns (uint256){
        return _price[id];
    }

    function setPrice(string memory id, uint256 newPrice) public {
        _price[id] = newPrice;
    }

    function getDescription(string memory id) public view returns (string memory) {
        return _descriptions[id];
    }

    function setDescription(string memory id, string memory newDescription) public {
        _descriptions[id] = newDescription;
    }

    function funds(address propietario) public view returns (uint256){
        return balanceOf(propietario, 0);
    }
    

    function addFunds() public payable onlyAdmin{
        _mint(msg.sender, 0, 100, "");
    }


    function buy(string memory id) public payable {
        safeTransferFrom(msg.sender, _seller[id], 0, _price[id], "");
        _safeTransferFrom(_property[id], msg.sender, _ids[id], 1, "");
        _property[id] = msg.sender;
    }

    function permission(string memory id) public {
        _seller[id] = _property[id];
        _property[id] = address(this);
        safeTransferFrom(msg.sender, _property[id], _ids[id], 1, "");
    }

}