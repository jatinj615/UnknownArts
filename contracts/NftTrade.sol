//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";


contract UnknownUniqueArt is ERC721{

    using Counters for Counters.Counter;
    Counters.Counter private tokenId;
    
    mapping (string => uint8) hashes;
    mapping (uint256 => string) tokenIdtoMetadata;
    struct Offer {
        bool isforsale;
        uint256 minValue;
        uint256 buyNow;
        address seller;
        address onlySellto;
    }

    struct Bid {
        bool hasbid;
        uint256 value;
        address bidder;
    }
    
    mapping (uint256 => Offer) artForSale;
    mapping (uint256 => Bid) artBid;

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function _setTokenUri(uint256 _tokenId, string memory _metadata) internal {
        tokenIdtoMetadata[_tokenId] = _metadata;
    }

    function _createAsset(address _recipient, string memory _hash, string memory _metadata) internal returns (uint256){
        require(hashes[_hash] != 1);
        hashes[_hash] = 1;
        tokenId.increment();
        uint256 artId = tokenId.current();
        _mint(_recipient, artId);
        _setTokenUri(artId, _metadata);
        return artId;
    }

    // function listAsset(address _recipient, )
}