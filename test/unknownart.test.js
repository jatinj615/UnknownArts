const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const ERC721Artifact = require('@openzeppelin/contracts/build/contracts/ERC721.json');
const IERC20Artifact = require('@openzeppelin/contracts/build/contracts/IERC20.json');

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
    let unknownUniqueArt,
        unknownUniqueArtExchange,
        token, notForSaleToken,
        ownerCut,
        tokenHash,
        minAmount,
        maxAmount,
        tokenMetadata,
        nft,
        dai,
        nftAddress,
        nftExchangeAddress,
        owner,
        signer,
        accounts = [];
    
    async function createAsset(creator, hash, metadata) {
        tokenHash = hash;
        tokenMetadata = metadata;
        createdToken = await unknownUniqueArt.createAssetToken(creator,
                                                        tokenHash,
                                                        tokenMetadata);
        return createdToken
    }

    async function listAsset(creator, tokenId, forSale, minAmount, maxAmount) {
        // approve exhange token contract for escrow
        await nft.connect(creator).approve(nftExchangeAddress, tokenId);

        await unknownUniqueArtExchange.connect(creator).listAsset(nftAddress,
                                                                  forSale,
                                                                  tokenId,
                                                                  minAmount,
                                                                  maxAmount)
        
    }

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

        // dai connection for impersonate account
        const ierc20Abi = IERC20Artifact.abi;
        const impersonateAccount = "0x9e033f4d440c4e387ed87759cb4436c7a95c45a3"
        const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
        const provider = ethers.getDefaultProvider();
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x9e033f4d440c4e387ed87759cb4436c7a95c45a3"]
        })
        signer = ethers.provider.getSigner(impersonateAccount);
        dai = new ethers.Contract(daiAddress, ierc20Abi, signer);
        // devide balance into different accounts
        accounts = await ethers.getSigners();
        owner = accounts[0];
        const balanceAmount = ethers.utils.parseEther("10");
        for(i=0; i<=5; i++) {
            dai.connect(signer).transfer(accounts[i].address, balanceAmount);
        };
    })

    it("should test create asset for user and test asset data", async function(){
        tokenHash = 'unique1';
        tokenMetadata = 'https://unique1';
        token = await createAsset(accounts[2].address, tokenHash, tokenMetadata)
        
        // fetch token Id from events data
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId;

        assert.equal(await unknownUniqueArt.ownerOf(tokenId), accounts[2].address);
        assert.equal(await unknownUniqueArt.assetMetadata(tokenId), tokenMetadata);
    })

    it("should test for duplicate asset creation", async function(){
        const assetCreate = unknownUniqueArt.createAssetToken(accounts[2].address,
                                                       tokenHash,
                                                       tokenMetadata);
        await assertRevert(assetCreate, "Token with hash already created");
    })

    it("should try to list asset with non token owner", async function(){
        const forSale = true;
        minAmount = ethers.utils.parseEther("0.01");
        maxAmount = ethers.utils.parseEther("0.05");
        // fetch token Id from events data
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId;
        
        // nft contract
        nft = new ethers.Contract(nftAddress,ERC721Artifact.abi, owner);

        // list asset to exchange
        await nft.connect(accounts[2]).approve(nftExchangeAddress, tokenId);

        const tokenList = unknownUniqueArtExchange.connect(accounts[3]).listAsset(nftAddress,
                                                                  forSale,
                                                                  tokenId,
                                                                  minAmount,
                                                                  maxAmount)
        
        await assertRevert(tokenList, "Not the owner of token")
    })

    it("should list asset and test offer data", async function(){
        const forSale = true;
        minAmount = ethers.utils.parseEther("0.01");
        maxAmount = ethers.utils.parseEther("0.05");
        // fetch token Id from events data
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId;
        
        // nft contract
        nft = new ethers.Contract(nftAddress,ERC721Artifact.abi, owner);

        // list asset to exchange
        await listAsset(accounts[2], tokenId, forSale, minAmount, maxAmount);
        
        assert.equal(await unknownUniqueArtExchange.assetForSale(tokenId), forSale);
        assert.equal((await unknownUniqueArtExchange.assetMinValue(tokenId)).toString(), minAmount.toString());
        assert.equal((await unknownUniqueArtExchange.assetMaxValue(tokenId)).toString(), maxAmount.toString());
    })

    it("should bid on the asset and test bid data", async function(){
        // fetch token Id from events data
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.02");
        
        // approve contract for the bid amount
        await dai.connect(accounts[3]).approve(unknownUniqueArtExchange.address, bidAmount);
        await unknownUniqueArtExchange.makeBid(nftAddress,
                                               accounts[3].address,
                                               bidAmount,
                                               tokenId);

        assert.equal(await unknownUniqueArtExchange.assetBidder(tokenId), accounts[3].address);
        assert.equal((await unknownUniqueArtExchange.assetCurrentBid(tokenId)).toString(), bidAmount.toString());
    })

    it("should make bid on not for sale asset", async function(){

        // create new token 
        notForSaleToken = await createAsset(accounts[2].address, 
                                            "unique2",
                                            "https://unique2");
                                                                
        // fetch token id from events data
        const tokenLog = await notForSaleToken.wait();
        const tokenId = tokenLog.events[0].args.tokenId;
        
        // list asset token to exchange
        const forSale = false;
        await nft.connect(accounts[2]).approve(nftExchangeAddress, tokenId);
        
        await listAsset(accounts[2], tokenId, forSale, minAmount, maxAmount)

        // make bid on not for sale token
        const bidAmount = ethers.utils.parseEther("0.02");
        // approve contract for the bid amount
        await dai.connect(accounts[3]).approve(unknownUniqueArtExchange.address, bidAmount);

        const newBid = unknownUniqueArtExchange.makeBid(nftExchangeAddress, 
                                                        accounts[3].address,
                                                        bidAmount,
                                                        tokenId);
        
        await assertRevert(newBid, "NFT not for sale");
        
    })

    it("should try to bid lower than minimum value", async function(){
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.005");

        // approve contract for the bid amount
        await dai.connect(accounts[1]).approve(unknownUniqueArtExchange.address, bidAmount);
        const lowerBid = unknownUniqueArtExchange.makeBid(nftAddress,
                                                          accounts[1].address,
                                                          bidAmount,
                                                          tokenId)
        
        await assertRevert(lowerBid, "Bid cannot be less than minimum asking price");
    })

    it("should try to bid more than maximum value", async function(){
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.06");

        // approve contract for the bid amount
        await dai.connect(accounts[1]).approve(unknownUniqueArtExchange.address, bidAmount);
        const lowerBid = unknownUniqueArtExchange.makeBid(nftAddress,
                                                          accounts[1].address,
                                                          bidAmount,
                                                          tokenId)
        await assertRevert(lowerBid, "Bid cannot be more than maximum price");
    })

    it("should bid lower than current bid", async function(){
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId
        
        const bidAmount = ethers.utils.parseEther("0.015");

        // approve contract for the bid amount
        await dai.connect(accounts[1]).approve(unknownUniqueArtExchange.address, bidAmount);

        let lowerBid = unknownUniqueArtExchange.makeBid(nftAddress,
                                                        accounts[1].address,
                                                        bidAmount,
                                                        tokenId)
        await assertRevert(lowerBid, "Higher bid required");
    })
    
    it("should try to buy asset not for sale", async function(){
        // fetch token id from events data
        const tokenLog = await notForSaleToken.wait();
        const tokenId = tokenLog.events[0].args.tokenId;
        
        const amount = maxAmount
        
        // approve contract for the buy amount
        await dai.connect(accounts[4]).approve(unknownUniqueArtExchange.address, amount);

        const buyAsset = unknownUniqueArtExchange.buyNow(accounts[4].address,
                                                         amount,
                                                         tokenId)
            
        await assertRevert(buyAsset, "NFT not for sale");
    })
        
    it("should try to buy token with amount different than maximun asking price", async function(){
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId
        
        const amount = ethers.utils.parseEther("0.06")

        // approve contract for the buy amount
        await dai.connect(accounts[4]).approve(unknownUniqueArtExchange.address, amount);
        
        const buyAsset = unknownUniqueArtExchange.buyNow(accounts[4].address,
                                                         amount,
                                                         tokenId)
                  
        await assertRevert(buyAsset, "Amount not equal to maximun asking price");
    })
    
    it("should buy the asset and test for new owner", async function(){
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId

        const amount = maxAmount

        // approve contract for the buy amount
        await dai.connect(accounts[4]).approve(unknownUniqueArtExchange.address, amount);
        
        await unknownUniqueArtExchange.buyNow(accounts[4].address,
                                              amount,
                                              tokenId)
        
        assert.equal(await unknownUniqueArt.ownerOf(tokenId), accounts[4].address);
    })

    it("should try to accept bid on not for sale NFT", async function(){
        // fetch token id from events data
        const tokenLog = await notForSaleToken.wait();
        const tokenId = tokenLog.events[0].args.tokenId;

        const accepting = unknownUniqueArtExchange.connect(accounts[2]).acceptBid(unknownUniqueArt.address,
                                                                                  tokenId)
        
        await assertRevert(accepting, "NFT not for sale");
    })

    it("should try to accept bid on NFT with no bids", async function(){
        // create and list new NFT token
        tokenHash = 'unique3';
        tokenMetadata = 'https://unique3';
        const forSale = true;
        token = await createAsset(accounts[2].address, tokenHash, tokenMetadata)
        // fetch tokenId from events data
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId
        // list created token
        await listAsset(accounts[2], tokenId, forSale, minAmount, maxAmount)

        // accept bid
        const accepting = unknownUniqueArtExchange.connect(accounts[2]).acceptBid(unknownUniqueArt.address,
                                                                                  tokenId)
        await assertRevert(accepting, "NFT does not have any active bid");
    })

    it("should try to accept bid on NFT with non authorised user", async function(){
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId
        
        const accepting = unknownUniqueArtExchange.connect(accounts[5]).acceptBid(unknownUniqueArt.address,
                                                                                  tokenId)
        await assertRevert(accepting, "NFT does not have any active bid");
    })
    
    it("should accept current bid and test new owner", async function(){
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId

        // bid on the created token
        const bidAmount = ethers.utils.parseEther("0.02");
        
        // approve contract for the bid amount
        await dai.connect(accounts[3]).approve(unknownUniqueArtExchange.address, bidAmount);
        await unknownUniqueArtExchange.makeBid(nftAddress,
                                               accounts[3].address,
                                               bidAmount,
                                               tokenId);

        await unknownUniqueArtExchange.connect(accounts[2]).acceptBid(unknownUniqueArt.address,
                                                                      tokenId)
        
        assert.equal(await unknownUniqueArt.ownerOf(tokenId), accounts[3].address);
    })
})