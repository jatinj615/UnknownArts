const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const ERC271Artifact = require('@openzeppelin/contracts/build/contracts/ERC721.json');
const IERC20Artifact = require('@openzeppelin/contracts/build/contracts/IERC20.json');


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

    it("should list asset and test offer data", async function(){
        // create asset
        tokenHash = 'unique1';
        tokenMetadata = 'https://unique1';
        token = await createAsset(accounts[2].address, tokenHash, tokenMetadata)

        // list asset
        const forSale = true;
        minAmount = ethers.utils.parseEther("0.01");
        maxAmount = ethers.utils.parseEther("0.05");
        // fetch token Id from events data
        const tokenLog = await token.wait();
        const tokenId = tokenLog.events[0].args.tokenId;
        
        // nft contract
        nft = new ethers.Contract(nftAddress,ERC271Artifact.abi, owner);

        // list asset to exchange
        await listAsset(accounts[2], tokenId, forSale, minAmount, maxAmount);
        
        assert.equal(await unknownUniqueArtOffExchange.assetForSale(tokenId), forSale);
        assert.equal((await unknownUniqueArtOffExchange.assetMinValue(tokenId)).toString(), minAmount.toString());
        assert.equal((await unknownUniqueArtOffExchange.assetMaxValue(tokenId)).toString(), maxAmount.toString());
    })

    // it("should test signature", async function(){
    //     // deploy NFT Exchange Contract
    //     ownerCut = ethers.BigNumber.from("500")
    //     const UnknownUniqueArtOffExchange = await ethers.getContractFactory("UnknownUniqueArtOffExchange");
    //     unknownUniqueArtOffExchange = await UnknownUniqueArtOffExchange.deploy(ownerCut)
    //     await unknownUniqueArtOffExchange.deployed();
    //     nftExchangeAddress = unknownUniqueArtOffExchange.address;
    //     let message = "Hello world"
        
    //     privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    //     accounts = await ethers.getSigners();
    //     hash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["string"], [ "Hello world" ]))
    //     // var wallet = new ethers.Wallet(privateKey);
    //     var signature = await accounts[0].signMessage(ethers.utils.arrayify(hash));
        
    //     var sig = ethers.utils.splitSignature(signature);
    //     console.log(sig)
    //     console.log("Recovered:", ethers.utils.verifyMessage(ethers.utils.arrayify(hash), sig));

        // console.log(hash);
        // console.log(accounts[0].address)
        // await unknownUniqueArtOffExchange.connect(accounts[0]).testSign(message, sig.v, sig.r, sig.s)
    // }) 
})