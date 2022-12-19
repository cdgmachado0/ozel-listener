const { fork } = require('node:child_process');
const { ethers } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;

const whileFork = fork('while-fork.js');

/**
 * *** Auto redeem ***
 * storageBeaconAddr = '0x8bA82da2e57993904A4254C398e09A4AB7d388e6'
 * emitterAddr = '0xb4Dc0300c55df2bF66AA2B29AEb4055b9A7C2D19'; 
 * redeemedHashesAddr = '0x233F3496e738674e4334347190cddCFB7f600F38'; 
 * proxy = 0x3A89c74e35c68C1FdD376B582620E375446d3909
 * taskId = 0x21bc92e60b6331c08c6a2789a6cd6f6fffcb550936a223b0b4e97291690e756b
 * FakeOZL = 0x3238a11A635bB334AaFC064CA90B893515551C68
 * ozERC1967 = 0x34924c8bC689E0a4D648B83cb1C611CF2b0dC53e
 * ProxyFactory = 0x1B5941104AC614D445bfE9a535163bDAba32C95B
 * 
 * *** Manual redeem ***
 * storageBeaconAddr = 0xDf2956dB0E0c283d2cd7eB27ecBDaBBdEe329516
 * emitterAddr = 0x45cEaeAB767265352977E136234E4A0c3d5cDC44
 * redeemedHashesAddr = 0xBAa20c48292C4Be9319dA3E7620F4364aac498b4
 * proxy = 0x858F9F673Df70DB94c49cdDD221AE2C46451C9Cc
 * taskId = 0xdce9249b88d8f3d96c8f3ec6f939437487af37fc91b81b37a26b734c125c587f
 * FakeOZL= 0x52001CA6f781C3966577084EC0B386506C25dFD5
 * ozERC1967 = 0x85bD2228aab3aB81Bdfc4946DFF2c4c58796610b
 */

const emitterAddr = '0x45cEaeAB767265352977E136234E4A0c3d5cDC44'; 
const proxyQueue = [];


async function main() {

    const filter = {
        address: emitterAddr, 
        topics: [
            ethers.utils.id("ShowTicket(address)") 
        ]
    };

    console.log('listening...');

    await hre.ethers.provider.on(filter, async (encodedData) => { 
        let codedProxy = encodedData.topics[1];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);

        if (proxyQueue.indexOf(proxy) === -1) proxyQueue.push(proxy);

        whileFork.send(proxyQueue);
    });

    whileFork.on('message', (msg) => proxyQueue.shift());
}



main();












