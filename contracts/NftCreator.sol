//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import {ERC721Transfer} from "./ERC721Transfer.sol";


contract UnknownUniqueArt is ERC721Transfer{

    using Counters for Counters.Counter;
    Counters.Counter private tokenId;
    
    mapping (string => uint256) hashes;
    mapping (uint256 => string) tokenIdtoMetadata;


    constructor(string memory _name, string memory _symbol) 
                ERC721Transfer(_name, _symbol) {}

    function _setTokenUri(uint256 _tokenId, 
                          string memory _metadata) private {
        tokenIdtoMetadata[_tokenId] = _metadata;
    }

    function assetMetadata(uint256 _tokenId) public view returns (string memory) {
        return tokenIdtoMetadata[_tokenId];
    }

    modifier isTokenOwner(uint256 _tokenId, address _sender) {
        require(ownerOf(_tokenId) == _sender);
        _;
    }

    function _createAssetToken(address _creator, 
                          string memory _hash, 
                          string memory _metadata) private returns (uint256){
        require(hashes[_hash] == 0, "Token with hash already created");
        tokenId.increment();
        uint256 artId = tokenId.current();
        _mint(_creator, artId);
        _setTokenUri(artId, _metadata);
        hashes[_hash] = artId;
        return artId;
    }

    function createAssetToken(address _creator,
                              string memory _hash,
                              string memory _metadata) public returns (uint256) {
        
        require(_creator != address(0), "address does not exist");
        uint256 newTokenId = _createAssetToken(_creator, _hash, _metadata);
        return newTokenId;
    }


}