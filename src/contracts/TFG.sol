// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract RoyaltyNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ERC2981 {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("Non Fungible Notes", "NFN") {
        _setDefaultRoyalty(msg.sender, 100);
    }

    function mintNFT(address recipient, string memory tokenURI)
        public onlyOwner
        returns (uint256) 
    {
        _tokenIdCounter.increment();

        uint256 newItemId = _tokenIdCounter.current();
        _safeMint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    function mintNFTWithRoyalty(address recipient, string memory tokenURI, address royaltyReceiver, uint96 feeNumerator)
        public onlyOwner
        returns (uint256) 
    {
        uint256 tokenId = mintNFT(recipient, tokenURI);
        _setTokenRoyalty(tokenId, royaltyReceiver, feeNumerator);

        return tokenId;
    }
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        _resetTokenRoyalty(tokenId);
    }

    function burnNFT(uint256 tokenId)
        public onlyOwner {
        _burn(tokenId);
    }

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
        override(ERC721, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeConsecutiveTokenTransfer(
        address,
        address,
        uint256,
        uint96
    ) internal virtual override(ERC721, ERC721Enumerable) {
        revert("ERC721Enumerable: consecutive transfers not supported");
    }

}