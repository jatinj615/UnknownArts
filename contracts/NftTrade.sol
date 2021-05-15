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
    mapping (uint256 => address) tokenToOwner;

    struct Offer {
        bool isForSale;
        uint256 minValue;
        uint256 maxValue;
        address seller;
    }

    struct Bid {
        bool hasbid;
        uint256 value;
        address bidder;
    }
    
    mapping (uint256 => Offer) artForSale;
    mapping (uint256 => Bid) artBid;

    modifier isTokenOwner(uint256 _tokenId) {
        require(tokenToOwner[_tokenId] == msg.sender);
        _;
    }

    constructor(string memory _name, string memory _symbol) 
                ERC721(_name, _symbol) {}

    function _setTokenUri(uint256 _tokenId, 
                          string memory _metadata) internal {
        tokenIdtoMetadata[_tokenId] = _metadata;
    }

    function _createAsset(address _recipient, 
                          string memory _hash, 
                          string memory _metadata) internal returns (uint256){
        require(hashes[_hash] != 1);
        hashes[_hash] = 1;
        tokenId.increment();
        uint256 artId = tokenId.current();
        _mint(_recipient, artId);
        _setTokenUri(artId, _metadata);
        tokenToOwner[artId] = _recipient;
        return artId;
    }

    function listAsset(address _recipient,
                       string memory _hash,
                       string memory _metadata, 
                       uint256 _minValue, 
                       uint256 _maxValue) public returns (uint256) {
        uint256 _tokenId = _createAsset(_recipient, _hash, _metadata);
        artForSale[_tokenId] = Offer(true,
                                     _minValue,
                                     _maxValue,
                                     _recipient);
        console.log(_tokenId);
        return _tokenId;
    }

    function makeBid(address _bidder, uint256 value, uint256 _tokenId) public {
        Offer memory askedItem = artForSale[_tokenId];
        require(askedItem.isForSale == true &&
                askedItem.minValue <= value &&
                askedItem.maxValue >= value);
        Bid memory itemBid = artBid[_tokenId];
        if (itemBid.hasbid) {
            console.log(itemBid.value);
            require(itemBid.value < value);
            artBid[_tokenId] = Bid(true, value, _bidder);
            console.log(itemBid.value);
        }else {
            artBid[_tokenId] = Bid(true, value, _bidder);
        }
    }
}