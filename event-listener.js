const { ethers } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');
const { sBeaconABI, redeemABI } = require('./abis.json');

const {
    l1ProviderTestnet,
    network,
    ops,
    l2Wallet
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
 * 
 * *** Manual redeem ***
 * storageBeaconAddr = 0x303657c8537Cf804788740A09f2A5CC7A000C6c3
 * emitterAddr = 0x8b7340C9E4Bd73e1e83E273c997ff49943C1f424
 * redeemedHashesAddr = 0xC4999134b359107305C67f3a513B56F78E9262c2
 * proxy = 0x978D205Dc4f41f00b6CeBe3e1441E21b1aC4FB0b
 */

const storageBeaconAddr = '0x303657c8537Cf804788740A09f2A5CC7A000C6c3'; 
const emitterAddr = '0x8b7340C9E4Bd73e1e83E273c997ff49943C1f424'; 
const redeemedHashesAddr = '0xC4999134b359107305C67f3a513B56F78E9262c2'; 

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
            console.log('executions: ', executions);

            parent:
            for (let i=0; i < executions.length; i++) {
                let [ hash ] = executions[i].id.split(':');
                console.log('hash: ', hash);

                let notInCheckedArray = tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1;
                if (!notInCheckedArray) continue parent;

                let [ message, wasRedeemed ] = await checkHash(hash);

                wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : await redeemHash(message, hash, taskId);
            }

            //----------
            // const redeemedHashes = await hre.ethers.getContractAt(redeemABI, redeemedHashesAddr);
            // const redemptions = await redeemedHashes.connect(l2Wallet).getTotalRedemptions();
            // console.log('redemptions: ', redemptions);
            // console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);
        }
    });
}


async function checkHash(hash) { 
    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const message = await l1Receipt.getL1ToL2Message(l2Wallet);
    const status = (await message.waitForStatus()).status;
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;

    return [
        message,
        wasRedeemed
    ];
}

async function redeemHash(message, hash, taskId) {
    let tx = await message.redeem(ops);
    await tx.wait();
    console.log(`hash: ${hash} redemeed ^^^^^`);
    tasks[taskId].alreadyCheckedHashes.push(hash);
    
    const redeemedHashes = await hre.ethers.getContractAt(redeemABI, redeemedHashesAddr);
    tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash);
    await tx.wait();

    //---------
    const redemptions = await redeemedHashes.connect(l2Wallet).getTotalRedemptions();
    console.log('redemptions: ', redemptions);
    console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);
}



main();


// module.exports = {
//     checkHash,
//     redeemHash
// };


