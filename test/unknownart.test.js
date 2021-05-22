const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const ERC271Artifact = require('@openzeppelin/contracts/build/contracts/ERC721.json');

async function assertRevert(promise, errorMessage = null) {
    try {
      const tx = await promise;
      const receipt = await ethers.provider.getTransactionReceipt(tx.tx);
      if (receipt.gasUsed >= 6700000) {
        return;
      }
    } catch (error) {
      if (errorMessage) {
        assert(error.message.search(errorMessage) >= 0, `Expected ${errorMessage} `);
      }
      const invalidOpcode = error.message.search("revert") >= 0;
      assert(invalidOpcode, "Expected revert, got '" + error + "' instead");
      return;
    }
    assert.ok(false, 'Error containing "revert" must be returned');
}
  

describe("UnknownUniqueArt", function(){
    let unknownUniqueArt;
    let unknownUniqueArtExchange;
    let accounts = [];
    let token;
    let ownerCut;
    let tokenHash;
    let minAmount;
    let maxAmount;
    let tokenMetadata;
    let nft;
    let nftAddress;
    let nftExchangeAddress;
    let owner;

    before(async function(){
        const UnknownUniqueArt = await ethers.getContractFactory("UnknownUniqueArt");
        unknownUniqueArt = await UnknownUniqueArt.deploy("UnknownUniqueArt", "UUA");
        // deploy NFT contract
        await unknownUniqueArt.deployed();
        nftAddress = unknownUniqueArt.address;

        // deploy NFT Exchange Contract
        ownerCut = ethers.BigNumber.from("500")
        const UnknownUniqueArtExchange = await ethers.getContractFactory("UnknownUniqueArtExchange");
        unknownUniqueArtExchange = await UnknownUniqueArtExchange.deploy(ownerCut)
        await unknownUniqueArtExchange.deployed();
        nftExchangeAddress = unknownUniqueArtExchange.address;
    })

    it("should test create asset for user and test asset data", async function(){
        accounts = await ethers.getSigners();
        owner = accounts[0];
        tokenHash = 'abc';
        tokenMetadata = 'https://abc';
        const forSale = true
        token = await unknownUniqueArt.createAssetToken(accounts[2].address,
                                                   tokenHash,
                                                   tokenMetadata);
        // fetch token Id from events data
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId;

        assert.equal(await unknownUniqueArt.ownerOf(tokenId), accounts[2].address);
        assert.equal(await unknownUniqueArt.assetMetadata(tokenId), tokenMetadata);
    })

    it("should test for duplicate asset creation", async function(){
        const assetCreate = unknownUniqueArt.createAssetToken(accounts[2].address,
                                                       tokenHash,
                                                       tokenMetadata);
        await assertRevert(assetCreate, "Token with hash already created");
    })

    it("should list asset and test offer data", async function(){
        const forSale = true;
        minAmount = ethers.utils.parseEther("0.01");
        maxAmount = ethers.utils.parseEther("0.05");
        // fetch token Id from events data
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId;
        
        // nft contract
        nft = new ethers.Contract(nftAddress,ERC271Artifact.abi, owner);

        // approve exhange token contract for escrow
        await nft.connect(accounts[2]).approve(nftExchangeAddress, tokenId);

        await unknownUniqueArtExchange.connect(accounts[2]).listAsset(nftAddress,
                                                                      forSale,
                                                                      tokenId,
                                                                      minAmount,
                                                                      maxAmount)
        
        assert.equal(await unknownUniqueArtExchange.assetForSale(tokenId), forSale);
        assert.equal((await unknownUniqueArtExchange.assetMinValue(tokenId)).toString(), minAmount.toString());
        assert.equal((await unknownUniqueArtExchange.assetMaxValue(tokenId)).toString(), maxAmount.toString());
    })

    it("should bid on the asset and test bid data", async function(){
        // fetch token Id from events data
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.02");
        await unknownUniqueArtExchange.makeBid(nftAddress,
                                               accounts[3].address,
                                               bidAmount,
                                               tokenId);
        
        assert.equal(await unknownUniqueArtExchange.assetBidder(tokenId), accounts[3].address);
        assert.equal((await unknownUniqueArtExchange.assetCurrentBid(tokenId)).toString(), bidAmount.toString());
    })

    it("should make bid on not for sale asset", async function(){

        // create new token 
        const newToken = await unknownUniqueArt.createAssetToken(accounts[2].address, 
                                                                "xyz",
                                                                "https://xyz");
                                                                
        // fetch token id from events data
        const token_log = await newToken.wait();
        const tokenId = token_log.events[0].args.tokenId;
        
        // list asset token to exchange
        const forSale = false;
        await nft.connect(accounts[2]).approve(nftExchangeAddress, tokenId);
        
        await unknownUniqueArtExchange.connect(accounts[2]).listAsset(nftAddress,
                                                                      forSale,
                                                                      tokenId,
                                                                      minAmount,
                                                                      maxAmount)

        // make bid on not for sale token
        const bidAmount = ethers.utils.parseEther("0.02");
        const newBid = unknownUniqueArtExchange.makeBid(nftExchangeAddress, 
                                                        accounts[3].address,
                                                        bidAmount,
                                                        tokenId);
        
        await assertRevert(newBid, "NFT not for sale");
        
    })

    it("should try to bid lower than minimum value", async function(){
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.005");
        const lowerBid = unknownUniqueArtExchange.makeBid(nftAddress,
                                                          accounts[1].address,
                                                          bidAmount,
                                                          tokenId)
        await assertRevert(lowerBid, "Bid cannot be less than minimum asking price");
    })

    it("should try to bid more than maximum value", async function(){
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.06");
        const lowerBid = unknownUniqueArtExchange.makeBid(nftAddress,
                                                          accounts[1].address,
                                                          bidAmount,
                                                          tokenId)
        await assertRevert(lowerBid, "Bid cannot be more than maximum price");
    })

    it("should bid lower than current bid", async function(){
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.015");
        let lowerBid = unknownUniqueArtExchange.makeBid(nftAddress,
                                                        accounts[1].address,
                                                        bidAmount,
                                                        tokenId)
        await assertRevert(lowerBid, "Higher bid required");
    })

    // it("should buy the asset", async function(){
    //     const token_log = await token.wait();
    //     const tokenId = token_log.events[0].args.tokenId

    //     const amount = maxAmount
    // })

})