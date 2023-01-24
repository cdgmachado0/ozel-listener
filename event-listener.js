const { fork } = require('node:child_process');
const { ethers } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;

const whileFork = fork('while-fork.js');

const emitterAddr = '0xd10f9bAD680d551F7709841abe3Dea5d354D9e2c'; 
const proxyQueue = {
    proxies: [],
    deets: []
};


async function main() {

    const filter = {
        address: emitterAddr, 
        topics: [
            ethers.utils.id("ShowTicket(address,address)") 
        ]
    };

    console.log('listeningg....');

    await hre.ethers.provider.on(filter, async (encodedData) => { 
        console.log('executing...');
        let codedProxy = encodedData.topics[1];
        let codedOwner = encodedData.topics[2];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);
        let [ owner ] = abiCoder.decode(['address'], codedOwner);

        if (proxyQueue.proxies.indexOf === -1) {
            proxyQueue.proxies.push(proxy);
            proxyQueue.deets.push({ proxy, owner });
        }

        // if (proxyQueue.indexOf(proxy) === -1) proxyQueue.push({ proxy, owner });
        // if (proxyQueue.map(pr => pr.proxy).indexOf(proxy) === -1) proxyQueue.push({ proxy, owner });

        whileFork.send(proxyQueue);
    });

    whileFork.on('message', (msg) => proxyQueue.shift());
}



main();












