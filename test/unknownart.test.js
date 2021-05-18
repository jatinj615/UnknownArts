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

    it("should test create asset for user", async function(){
        accounts = await ethers.getSigners();
        owner = accounts[0];
        minAmount = ethers.utils.parseEther("0.01");
        maxAmount = ethers.utils.parseEther("0.05");
        token_hash = 'abc';
        token_metadata = 'https://abc';
        token = await unknownUniqueArt.createAsset(accounts[2].address, 
                                                   token_hash,
                                                   token_metadata,
                                                   minAmount,
                                                   maxAmount);
        // fetch token Id from events data
        token_log = await token.wait();
        tokenId = token_log.events[0].args.tokenId;

        assert.equal(await unknownUniqueArt.assetCreator(tokenId), accounts[2].address);
    })

    it("should test created asset data", async function(){
        accounts = await ethers.getSigners();
        
        // fetch token Id from events data
        token_log = await token.wait();
        tokenId = token_log.events[0].args.tokenId;
        
        assert.equal(await unknownUniqueArt.assetMetadata(tokenId), token_metadata);
        assert.equal((await unknownUniqueArt.assetMinValue(tokenId)).toString(), minAmount.toString());
        assert.equal((await unknownUniqueArt.assetMaxValue(tokenId)).toString(), maxAmount.toString());
    })

    it("should test for duplicate asset creation", async function(){
        assetCreate = unknownUniqueArt.createAsset(accounts[2].address, 
                                                    token_hash,
                                                    token_metadata,
                                                    minAmount,
                                                    maxAmount);
        await assertRevert(assetCreate, "Token with hash already created");
    })

    it("Bids on the NFT", async function(){
        accounts = await ethers.getSigners();
        owner = accounts[0];
        
        // fetch token Id from events data
        token_log = await token.wait();
        tokenId = token_log.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.02");
        await unknownUniqueArt.makeBid(accounts[3].address,
                                       bidAmount,
                                       tokenId);
    })

    // it("Bids lower than current Bid", async function())a
})