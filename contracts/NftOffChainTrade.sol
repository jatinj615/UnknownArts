pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { Counters } from "@openzeppelin/contracts/utils/Counters.sol";
import {ERC721Transfer} from "./ERC721Transfer.sol";
import {UnknownUniqueArt} from "./NftCreator.sol";
import "hardhat/console.sol";

contract UnknownUniqueArtExchange {

    using SafeMath for uint256;
    using Counters for Counters.Counter;

    ERC721Transfer public nonFungibleContract;

    // Cut owner takes on each auction, measured in basis points (1/100 of a percent).
    // Values 0-10,000 map to 0%-10%
    uint256 public ownerCut;

    address daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    IERC20 dai = IERC20(daiAddress);

    mapping(address => Counters.Counter) private _nonces;

    struct Offer {
        bool isForSale;
        uint256 minValue;
        uint256 maxValue;
        address seller;
    }

    mapping (uint256 => Offer) artForSale;

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

    function calculateOwnerCut(uint256 value) public view returns (uint256) {
        return value.mul(ownerCut.div(10000));
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
    
    function acceptBid(
        address _nftAddress,
        address _bidder, 
        uint256 value, 
        uint256 _tokenId,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        Offer memory ownerOffer = artForSale[_tokenId];
        require(msg.sender == ownerOffer.seller, "Not authorised");
        bytes32 hash = keccak256(abi.encode(address(this), _nftAddress, _bidder, value, _tokenId, nonce));
        require(ecrecover(sha256(abi.encode("\x19Ethereum Signed Message:\n32", hash)),v,r,s) == _bidder);
        require(ownerOffer.isForSale, "NFT not for sale");
        nonFungibleContract = ERC721Transfer(_nftAddress);
        dai.transfer(ownerOffer.seller, value);
        nonFungibleContract.transfer(address(this), _bidder, _tokenId);
        delete artForSale[_tokenId];
    }

    function buyNow(address _buyer, uint256 value, uint256 _tokenId) public {
        Offer memory askedItem = artForSale[_tokenId];
        require (askedItem.isForSale, "NFT not for sale");
        require (askedItem.maxValue == value, "Amount not equal to maximun asking price");
        dai.transferFrom(_buyer, askedItem.seller, value);
        nonFungibleContract.transfer(address(this), _buyer, _tokenId);
        delete artForSale[_tokenId];
    }


}