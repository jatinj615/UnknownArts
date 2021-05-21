//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {UnknownUniqueArt} from "./NftCreator.sol";
import "hardhat/console.sol";


contract UnknownUniqueArtExchange {

    ERC721 public nonFungibleContract;

    uint256 public ownerCut;

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

    constructor(address _nftAddress, uint256 _cut) {
        nonFungibleContract = ERC721(_nftAddress);
        ownerCut = _cut;
    }

    modifier isTokenOwner(address _seller, uint256 _tokenId) {
        require(nonFungibleContract.ownerOf(_tokenId) == _seller, "Not the owner of token");
        _;
    }

    function assetMinValue(uint256 _tokenId) public view returns (uint256) {
        return artForSale[_tokenId].minValue;
    }

    function assetMaxValue(uint256 _tokenId) public view returns (uint256) {
        return artForSale[_tokenId].maxValue;
    }

    function assetBidder(uint _tokenId) public view returns (address) {
        return artBid[_tokenId].bidder;
    }

    function assetCurrentBid(uint _tokenId) public view returns (uint256) {
        return artBid[_tokenId].value;
    }

    function listAsset(uint256 _tokenId,
                       uint256 _minValue,
                       uint256 _maxValue) isTokenOwner(msg.sender, _tokenId) public{
        artForSale[_tokenId] = Offer(true,
                                     _minValue,
                                     _maxValue,
                                     msg.sender);
        nonFungibleContract.approve(address(this), _tokenId);
        nonFungibleContract.transferFrom(msg.sender, address(this), _tokenId);
    }

    function makeBid(address _bidder, uint256 value, uint256 _tokenId) public {
        Offer memory askedItem = artForSale[_tokenId];
        require(askedItem.isForSale == true, "NFT not for sale");
        require(askedItem.minValue <= value, "Bid cannot be less than minimum asking price");
        require(askedItem.maxValue > value, "Bid cannot be more than maximum price");
        Bid memory itemBid = artBid[_tokenId];
        if (itemBid.hasbid) {
            require(itemBid.value <= value, "Higher bid required");
            artBid[_tokenId] = Bid(true, value, _bidder);
        }else {
            artBid[_tokenId] = Bid(true, value, _bidder);
        }
    }

    // function acceptBid()

    function buyNow(address _buyer, uint256 value, uint256 _tokenId) public {
        Offer memory askedItem = artForSale[_tokenId];
        require (askedItem.isForSale == true, "NFT not for sale");
        require (askedItem.maxValue == value, "Amount not equal to Buy now");
        nonFungibleContract.transferFrom(address(this), _buyer, _tokenId);
    }


}