const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

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
    let accounts = [];
    let token;
    let token_hash;
    let minAmount;
    let maxAmount;
    let token_metadata;
    let owner;

    before(async function(){
        const UnknownUniqueArt = await ethers.getContractFactory("UnknownUniqueArt");
        unknownUniqueArt = await UnknownUniqueArt.deploy("UnknownUniqueArt", "UUA");
        // deploy NFT contract
        await unknownUniqueArt.deployed();
    })

    it("should test create asset for user and test asset data", async function(){
        accounts = await ethers.getSigners();
        owner = accounts[0];
        minAmount = ethers.utils.parseEther("0.01");
        maxAmount = ethers.utils.parseEther("0.05");
        token_hash = 'abc';
        token_metadata = 'https://abc';
        const forSale = true
        token = await unknownUniqueArt.createAsset(accounts[2].address, 
                                                   forSale,
                                                   token_hash,
                                                   token_metadata,
                                                   minAmount,
                                                   maxAmount);
        // fetch token Id from events data
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId;

        assert.equal(await unknownUniqueArt.ownerOf(tokenId), accounts[2].address);
        assert.equal(await unknownUniqueArt.assetMetadata(tokenId), token_metadata);
        assert.equal((await unknownUniqueArt.assetMinValue(tokenId)).toString(), minAmount.toString());
        assert.equal((await unknownUniqueArt.assetMaxValue(tokenId)).toString(), maxAmount.toString());
    })

    it("should test for duplicate asset creation", async function(){
        const forSale = true;
        const assetCreate = unknownUniqueArt.createAsset(accounts[2].address, 
                                                       forSale,
                                                       token_hash,
                                                       token_metadata,
                                                       minAmount,
                                                       maxAmount);
        await assertRevert(assetCreate, "Token with hash already created");
    })

    it("should bid on the asset and test bid data", async function(){
        // fetch token Id from events data
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.02");
        await unknownUniqueArt.makeBid(accounts[3].address,
                                       bidAmount,
                                       tokenId);
        
        assert.equal(await unknownUniqueArt.assetBidder(tokenId), accounts[3].address);
        assert.equal((await unknownUniqueArt.assetCurrentBid(tokenId)).toString(), bidAmount.toString());
    })

    it("should make bid on not for sale asset", async function(){
        const forSale = false;
        const newToken = await unknownUniqueArt.createAsset(accounts[2].address, 
                                                        forSale,
                                                        "xyz",
                                                        "https://xyz",
                                                        minAmount,
                                                        maxAmount);
        
        // fetch token id from events data
        const token_log = await newToken.wait();
        const tokenId = token_log.events[0].args.tokenId;
        
        const bidAmount = ethers.utils.parseEther("0.02");
        const newBid = unknownUniqueArt.makeBid(accounts[3].address,
                                                bidAmount,
                                                tokenId);
        
        await assertRevert(newBid, "NFT not for sale");
        
    })

    it("should try to bid lower than minimum value", async function(){
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.005");
        const lowerBid = unknownUniqueArt.makeBid(accounts[1].address,
                                                bidAmount,
                                                tokenId)
        await assertRevert(lowerBid, "Bid cannot be less than minimum asking price");
    })

    it("should try to bid more than maximum value", async function(){
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.06");
        const lowerBid = unknownUniqueArt.makeBid(accounts[1].address,
                                                bidAmount,
                                                tokenId)
        await assertRevert(lowerBid, "Bid cannot be more than maximum price");
    })

    it("should bid lower than current bid", async function(){
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.015");
        let lowerBid = unknownUniqueArt.makeBid(accounts[1].address,
                                                bidAmount,
                                                tokenId)
        await assertRevert(lowerBid, "Higher bid required");
    })

    it("should buy the asset", async function(){
        const token_log = await token.wait();
        const tokenId = token_log.events[0].args.tokenId

        const amount = maxAmount
    })

})