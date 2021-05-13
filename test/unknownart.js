const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("UnknownUniqueArt", function(){
    it("creates token", async function(){
        const UnknownUniqueArt = await ethers.getContractFactory("UnknownUniqueArt");
        const unknownUniqueArt = await UnknownUniqueArt.deploy("UnknownUniqueArt", "UUA");
        await unknownUniqueArt.deployed();
        console.log("deployed at - ", unknownUniqueArt.address);
        
        const [owner, addr1, addr2] = await ethers.getSigners();
        unknownUniqueArt.createAsset(addr2.address, 'abc', "https://abc");
    })
})