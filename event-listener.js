const { fork } = require('node:child_process');
const { ethers } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;

const whileFork = fork('while-fork.js');

const emitterAddr = '0x23916341eC5d94f8719A7c79e0E778D1221daEFa'; 
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

    console.log('listening...');

    await hre.ethers.provider.on(filter, async (encodedData) => { 
        console.log('1- executing...');
        let codedProxy = encodedData.topics[1];
        let codedOwner = encodedData.topics[2];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);
        let [ owner ] = abiCoder.decode(['address'], codedOwner);

        if (proxyQueue.proxies.indexOf(proxy) === -1) {
            console.log('2- added...');
            proxyQueue.proxies.push(proxy);
            proxyQueue.deets.push({ proxy, owner });
        }

        whileFork.send(proxyQueue);
    });

    whileFork.on('message', (msg) => {
        proxyQueue.proxies.shift();
        proxyQueue.deets.shift();
    });
}



main();












