const { fork } = require('node:child_process');
const { ethers } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;

const whileFork = fork('while-fork.js');

const emitterAddr = '0xd986Ac35f3aD549794DBc70F33084F746b58b534'; 
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

    console.log('listening....');

    await hre.ethers.provider.on(filter, async (encodedData) => { 
        let codedProxy = encodedData.topics[1];
        let codedOwner = encodedData.topics[2];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);
        let [ owner ] = abiCoder.decode(['address'], codedOwner);

        if (proxyQueue.proxies.indexOf(proxy) === -1) {
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












