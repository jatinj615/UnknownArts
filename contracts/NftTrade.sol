//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";


contract UnknownUniqueArt is ERC721{

    using Counters for Counters.Counter;
    Counters.Counter private tokenId;
    
    mapping (string => uint256) hashes;
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
        require(hashes[_hash] == 0);
        tokenId.increment();
        uint256 artId = tokenId.current();
        _mint(_recipient, artId);
        _setTokenUri(artId, _metadata);
        hashes[_hash] = artId;
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
        require(askedItem.isForSale == true, "NFT not for sale");
        require(askedItem.minValue <= value, "Bid less than minimum asking price");
        require(askedItem.maxValue > value, "Bid less than maximum price");
        Bid memory itemBid = artBid[_tokenId];
        if (itemBid.hasbid) {
            require(itemBid.value < value, "Higher bid already exist");
            artBid[_tokenId] = Bid(true, value, _bidder);
        }else {
            artBid[_tokenId] = Bid(true, value, _bidder);
        }
    }

    function buyNow(address _buyer, uint256 value, uint256 _tokenId) public {
        Offer memory askedItem = artForSale[_tokenId];
        require (askedItem.isForSale == true, "NFT not for sale");
        require (askedItem.maxValue == value, "Amount not equal Buy now");
        tokenToOwner[_tokenId] = _buyer;
    }

}