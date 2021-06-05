const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { bufferToHex, keccakFromString, ecsign, toBuffer } = require("ethereumjs-util");
const ERC271Artifact = require('@openzeppelin/contracts/build/contracts/ERC721.json');
const IERC20Artifact = require('@openzeppelin/contracts/build/contracts/IERC20.json');


describe("UnknownUniqueArtOffExchange", function(){
    it("should test signature", async function(){
        // deploy NFT Exchange Contract
        ownerCut = ethers.BigNumber.from("500")
        const UnknownUniqueArtOffExchange = await ethers.getContractFactory("UnknownUniqueArtOffExchange");
        unknownUniqueArtOffExchange = await UnknownUniqueArtOffExchange.deploy(ownerCut)
        await unknownUniqueArtOffExchange.deployed();
        nftExchangeAddress = unknownUniqueArtOffExchange.address;
        let message = "Hello world"
        
        privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        accounts = await ethers.getSigners();
        hash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["string"], [ "Hello world" ]))
        // var wallet = new ethers.Wallet(privateKey);
        var signature = await accounts[0].signMessage(ethers.utils.arrayify(hash));
        
        var sig = ethers.utils.splitSignature(signature);
        console.log(sig)
        console.log("Recovered:", ethers.utils.verifyMessage(ethers.utils.arrayify(hash), sig));

        // console.log(hash);
        // console.log(accounts[0].address)
        // await unknownUniqueArtOffExchange.connect(accounts[0]).testSign(message, sig.v, sig.r, sig.s)
    })
})