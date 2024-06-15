// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract TFG is ERC721, ERC721URIStorage, Ownable, ERC2981 {

    uint256 private _tokenIdCounter = 0;

    constructor(address initialOwner)
        ERC721("Non Fungible Notes", "NFN")
        Ownable(initialOwner)
    {
        _setDefaultRoyalty(msg.sender, 100);
    }

    function safeMint(address to, string memory uri) 
        public onlyOwner
        returns(uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }


    function mintNFTWithRoyalty(address recipient, string memory uri, address royaltyReceiver, uint96 feeNumerator)
        public onlyOwner
        returns (uint256) 
    {
        uint256 tokenId = safeMint(recipient, uri);
        _setTokenRoyalty(tokenId, royaltyReceiver, feeNumerator);

        return tokenId;
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

}