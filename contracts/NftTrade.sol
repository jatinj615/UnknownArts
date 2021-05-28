//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ERC721Transfer} from "./ERC721Transfer.sol";
import {UnknownUniqueArt} from "./NftCreator.sol";
import "hardhat/console.sol";


contract UnknownUniqueArtExchange {

    using SafeMath for uint256;

    ERC721Transfer public nonFungibleContract;

    // Cut owner takes on each auction, measured in basis points (1/100 of a percent).
    // Values 0-10,000 map to 0%-10%
    uint256 public ownerCut;

    address daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    IERC20 dai = IERC20(daiAddress);

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

    constructor(uint256 _cut) {
        require(_cut <= 1000, "Cut percentage should not exceed 10");
        ownerCut = _cut;
    }

    modifier isTokenOwner(address _nftAddress, address _seller, uint256 _tokenId) {
        nonFungibleContract = ERC721Transfer(_nftAddress);
        require(nonFungibleContract.ownerOf(_tokenId) == _seller, "Not the owner of token");
        _;
    }

    function assetForSale(uint256 _tokenId) public view returns (bool) {
        return artForSale[_tokenId].isForSale;
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

    function afterOwnerCut(uint256 value) public view returns (uint256) {
        return value.sub(value.mul(ownerCut.div(10000)));
    }

    function listAsset(address _nftAddress,
                       bool _forSale,
                       uint256 _tokenId,
                       uint256 _minValue,
                       uint256 _maxValue) isTokenOwner(_nftAddress, msg.sender, _tokenId) public{
        artForSale[_tokenId] = Offer(_forSale,
                                     _minValue,
                                     _maxValue,
                                     msg.sender);
        nonFungibleContract.transferFrom(msg.sender, address(this), _tokenId);
    }

    function makeBid(address _nftAddress, address _bidder, uint256 value, uint256 _tokenId) public {
        nonFungibleContract = ERC721Transfer(_nftAddress);
        Offer memory askedItem = artForSale[_tokenId];
        require(askedItem.isForSale, "NFT not for sale");
        require(askedItem.minValue <= value, "Bid cannot be less than minimum asking price");
        require(askedItem.maxValue > value, "Bid cannot be more than maximum price");
        Bid memory itemBid = artBid[_tokenId];
        if (itemBid.hasbid) {
            require(itemBid.value <= value, "Higher bid required");
            dai.transfer(itemBid.bidder, itemBid.value);
            artBid[_tokenId] = Bid(true, value, _bidder);
        }else {
            artBid[_tokenId] = Bid(true, value, _bidder);
        }
        dai.transferFrom(_bidder, address(this), value);
    }

    function acceptBid(address _nftAddress, uint256 _tokenId) public {
        Offer memory ownerOffer = artForSale[_tokenId];
        require(ownerOffer.isForSale, "NFT not for sale");
        Bid memory currentBid = artBid[_tokenId];
        require(currentBid.hasbid, "NFT does not have any active bid");
        nonFungibleContract = ERC721Transfer(_nftAddress);
        require(msg.sender == ownerOffer.seller, "Not authorised");
        uint256 valueAfterCut = afterOwnerCut(currentBid.value);
        dai.transfer(ownerOffer.seller, valueAfterCut);
        nonFungibleContract.transfer(address(this), currentBid.bidder, _tokenId);
        delete artForSale[_tokenId];
        delete artBid[_tokenId];
    }

    function buyNow(address _buyer, uint256 value, uint256 _tokenId) public {
        Offer memory askedItem = artForSale[_tokenId];
        require (askedItem.isForSale, "NFT not for sale");
        require (askedItem.maxValue == value, "Amount not equal to maximun asking price");
        // return amount to current bidder
        Bid memory itemBid = artBid[_tokenId];
        if (itemBid.hasbid) {
            dai.transfer(itemBid.bidder, itemBid.value);
        }
        uint256 valueAfterCut = afterOwnerCut(value);
        dai.transferFrom(_buyer, askedItem.seller, valueAfterCut);
        nonFungibleContract.transfer(address(this), _buyer, _tokenId);
        delete artForSale[_tokenId];
        delete artBid[_tokenId];
    }


}