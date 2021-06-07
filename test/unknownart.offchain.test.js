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

describe("UnknownUniqueArtOffExchange", function(){

    let unknownUniqueArt,
        unknownUniqueArtOffExchange,
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

        await unknownUniqueArtOffExchange.connect(creator).listAsset(nftAddress,
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
        const UnknownUniqueArtOffExchange = await ethers.getContractFactory("UnknownUniqueArtOffExchange");
        unknownUniqueArtOffExchange = await UnknownUniqueArtOffExchange.deploy(ownerCut)
        await unknownUniqueArtOffExchange.deployed();
        nftExchangeAddress = unknownUniqueArtOffExchange.address;

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

    it("should try to list asset with non token owner", async function(){
        // create asset
        tokenHash = 'unique1';
        tokenMetadata = 'https://unique1';
        token = await createAsset(accounts[2].address, tokenHash, tokenMetadata)

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

        const tokenList = unknownUniqueArtOffExchange.connect(accounts[3]).listAsset(nftAddress,
                                                                  forSale,
                                                                  tokenId,
                                                                  minAmount,
                                                                  maxAmount)
        
        await assertRevert(tokenList, "Not the owner of token")
    })

    it("should list asset and test offer data", async function(){
        // list asset
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
        
        assert.equal(await unknownUniqueArtOffExchange.assetForSale(tokenId), forSale);
        assert.equal((await unknownUniqueArtOffExchange.assetMinValue(tokenId)).toString(), minAmount.toString());
        assert.equal((await unknownUniqueArtOffExchange.assetMaxValue(tokenId)).toString(), maxAmount.toString());
    })

    // it("should accept bid on asset and test for new owner", async function(){
    //     // create bidder signature
    //     const value = ethers.utils.parseEther("0.04");
        
    //     // fetch token Id from events data
    //     const tokenLog = await token.wait();
    //     const tokenId = tokenLog.events[0].args.tokenId;

    //     const messageHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
    //         ["address", "address", "address", "uint256", "uint256"],
    //         [nftExchangeAddress, nftAddress, accounts[3].address, value, tokenId]
    //     ))
        
    //     var signature = await accounts[3].signMessage(ethers.utils.arrayify(messageHash));
    //     var sig = ethers.utils.splitSignature(signature);
    //     // transfer value to contract after creating signature
    //     await dai.connect(accounts[3]).transfer(nftExchangeAddress, value);

    //     // console.log(sig)
    //     await unknownUniqueArtOffExchange.connect(accounts[2]).acceptBid(
    //         nftAddress, accounts[3].address, value, tokenId, sig.v, sig.r, sig.s)
        
    //     assert.equal(await unknownUniqueArt.ownerOf(tokenId), accounts[3].address);
    // })

    it("should buy the asset and test for new owner", async function(){
        // create bidder signature
        const value = ethers.utils.parseEther("0.05");
        
        // fetch token Id from events data
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId;

        const messageHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "address", "uint256", "uint256"],
            [nftExchangeAddress, nftAddress, accounts[2].address, value, tokenId]
        ))
        
        var signature = await accounts[2].signMessage(ethers.utils.arrayify(messageHash));
        var sig = ethers.utils.splitSignature(signature);
        // transfer value to contract after creating signature
        await dai.connect(accounts[3]).approve(nftExchangeAddress, value);

        await unknownUniqueArtOffExchange.buyNow(
            nftAddress, accounts[3].address, value, tokenId, sig.v, sig.r, sig.s)
        
        assert.equal(await unknownUniqueArt.ownerOf(tokenId), accounts[3].address);
    })
})