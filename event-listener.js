const { ethers } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');
const { sBeaconABI, redeemABI } = require('./abis.json');

const {
    l1ProviderTestnet,
    network,
    ops,
    l2Wallet,
    l2ProviderTestnet
} = require('./state-vars.js');


const URL = `https://api.thegraph.com/subgraphs/name/gelatodigital/poke-me-${network}`;
const query = (taskId) => {
    return {
        query: `
            {
                tasks(where: {id: "${taskId}"}) {
                    id
                    taskExecutions {
                        id,
                        success
                    }
                }
            }
        `
    }
};

/**
 * *** Auto redeem ***
 * storageBeaconAddr = '0xAb6E71331EB929251fFbb6d00f571DDdC4aC1D9C'
 * emitterAddr = '0xB2CfB9e7239e7eFF83D0C730AcFD7a01B76d72f6'; 
 * redeemedHashesAddr = '0xB27331b9C86Fe0749BA7D01C9aCa7CDcF5Ce6788'; 
 * proxy = 0x253787140B6e5E735f999972815EEa0F955A1241
 * taskId = 0xeded15c41d113d7265fde3acc70be5d1967ddc9c7cddf1f82ec2dd6ed4334fc5
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

const storageBeaconAddr = '0xDf2956dB0E0c283d2cd7eB27ecBDaBBdEe329516'; 
const emitterAddr = '0x45cEaeAB767265352977E136234E4A0c3d5cDC44'; 
const redeemedHashesAddr = '0xBAa20c48292C4Be9319dA3E7620F4364aac498b4'; 

const tasks = {}; 
const proxyQueue = [];

async function main() {
    const storageBeacon = await hre.ethers.getContractAt(sBeaconABI, storageBeaconAddr);

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

        setTimeout(continueExecution, 120000);
        console.log('setTimeout rolling...');

        async function continueExecution() {
            proxy = proxyQueue.shift();
            let taskId = await storageBeacon.getTaskID(proxy);

            if (!tasks[taskId]) {
                tasks[taskId] = {};
                tasks[taskId].alreadyCheckedHashes = [];
            }

            let result = await axios.post(URL, query(taskId));
            let executions =  result.data.data.tasks[0].taskExecutions;

            parent:
            for (let i=0; i < executions.length; i++) {
                let [ hash ] = executions[i].id.split(':');
                console.log('hash: ', hash);

                let notInCheckedArray = tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1;
                if (!notInCheckedArray) continue parent;

                let [ message, wasRedeemed ] = await checkHash(hash);

                wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : await redeemHash(message, hash, taskId);
            }
        }
    });
}


async function checkHash(hash) { 
    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const messages = await l1Receipt.getL1ToL2Messages(l2Wallet);
    const message = messages[0];
    const messageRec = await message.waitForStatus();
    const status = messageRec.status;
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;

    return [
        message,
        wasRedeemed
    ];
}

async function redeemHash(message, hash, taskId) {
    console.log('redeeming...');
    try {
        let tx = await message.redeem(ops);
        await tx.waitForRedeem();
        console.log(`hash: ${hash} redemeed ^^^^^`);
        tasks[taskId].alreadyCheckedHashes.push(hash);
        
        const redeemedHashes = new ethers.Contract(redeemedHashesAddr, redeemABI, l2ProviderTestnet);
        tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash); 
        await tx.wait();
    } catch {}
} 



main();












