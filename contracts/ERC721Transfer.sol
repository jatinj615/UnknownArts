//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract ERC721Transfer is ERC721 {

    constructor(string memory _name, string memory _symbol) 
                ERC721(_name, _symbol) {}

    function transfer(address from, address to, uint256 tokenId) public {
        require(from != address(0), "ERC721: transfer of token from invalid address");
        _transfer(from, to, tokenId);
    }
}