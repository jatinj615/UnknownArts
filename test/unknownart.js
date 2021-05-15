const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("UnknownUniqueArt", function(){
    let unknownUniqueArt;

    beforeEach(async function(){
        const UnknownUniqueArt = await ethers.getContractFactory("UnknownUniqueArt");
        unknownUniqueArt = await UnknownUniqueArt.deploy("UnknownUniqueArt", "UUA");
        // deploy NFT contract
        await unknownUniqueArt.deployed();
        console.log("deployed at - ", unknownUniqueArt.address);
        
    })

    it("creates nft", async function(){
        const [owner, addr1, addr2] = await ethers.getSigners();
        const minAmount = ethers.utils.parseEther("0.01");
        const maxAmount = ethers.utils.parseEther("0.05");
        const tokenId = await unknownUniqueArt.listAsset(addr2.address, 
                                                         'abc',
                                                         "https://abc",
                                                         minAmount,
                                                         maxAmount);
    })
})