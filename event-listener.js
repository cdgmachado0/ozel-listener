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
 * storageBeaconAddr = 0xd7ED96eD862eCd10725De44770244269e2978b5E
 * emitterAddr = 0x124bd273D2007fb71151cb5e16e3Fc1557748147
 * redeemedHashesAddr = 0x9b482ed221e548a8cdB1B7177079Aef68D8AB298
 * proxy = 0x254d6F75D6B4A23Db420d03785CF39bd45dab012
 * taskId = 0x961cdb20505a367a0a83c6b33f8fdc308721369409c3a69ca79d7c608fd58367
 * FakeOZL = 0x46b76297BBfBBcECdB3e98B37514e0e5C41b6aDf
 * ozERC1967 = 0x3bb56739519F41Ddb3CDf7f6875956a6DEf99227
 */

const emitterAddr = '0x124bd273D2007fb71151cb5e16e3Fc1557748147'; 
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
        console.log('executing...');
        let codedProxy = encodedData.topics[1];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);

        if (proxyQueue.indexOf(proxy) === -1) proxyQueue.push(proxy);

        whileFork.send(proxyQueue);
    });

    whileFork.on('message', (msg) => proxyQueue.shift());
}



main();












