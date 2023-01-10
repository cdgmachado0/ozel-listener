const { fork } = require('node:child_process');
const { ethers } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;

const whileFork = fork('while-fork.js');

const emitterAddr = '0x068dC6Ae11639E458575e5a997aE35a69b577964'; 
const proxyQueue = [];


async function main() {

    const filter = {
        address: emitterAddr, 
        topics: [
            ethers.utils.id("ShowTicket(address)") 
        ]
    };

    console.log('listeningg....');

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












