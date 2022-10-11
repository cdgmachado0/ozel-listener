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
 * storageBeaconAddr = 0xa97D464b0eE887FFfda78bbeD0424648D61d5642
 * emitterAddr = 0xaf77634552BB61d593448D035fcFeae5a73Ab021
 * redeemedHashesAddr = 0x3468Eb72D0216A3160fdB53ca4D79Bf0B9fD2f5C
 * proxy = 0xBAF6B194A7f84b659ff5570587D9cD597da31ca2
 * taskId = 0x673437a82e5c11113ccecb1a88019cc21894f9738fbd9d37b2d6b39bf28936e0
 */

const storageBeaconAddr = '0xAb6E71331EB929251fFbb6d00f571DDdC4aC1D9C'; 
const emitterAddr = '0xB2CfB9e7239e7eFF83D0C730AcFD7a01B76d72f6'; 
const redeemedHashesAddr = '0xB27331b9C86Fe0749BA7D01C9aCa7CDcF5Ce6788'; 

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
            console.log('---- for auto -----');
            const redeemedHashes = new ethers.Contract(redeemedHashesAddr, redeemABI, l2ProviderTestnet);
            const redemptions = await redeemedHashes.getTotalRedemptions();
            console.log('redemptions: ', redemptions);
            console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);
            console.log('---- for auto -----');
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
    let tx = await message.redeem(ops);
    await tx.waitForRedeem();
    console.log(`hash: ${hash} redemeed ^^^^^`);
    tasks[taskId].alreadyCheckedHashes.push(hash);
    
    const redeemedHashes = new ethers.Contract(redeemedHashesAddr, redeemABI, l2ProviderTestnet);

    tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash); 
    await tx.wait();

    //---------
    console.log('redeemed');
    // const redemptions = await redeemedHashes.getTotalRedemptions();
    // console.log('redemptions: ', redemptions);
    // console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);
}


async function redeemTest() {
    const hash = '0x9cf3d4140e195bdda5e02073760ab935d88cfaf7d05af23354f891859659dfb1';
    const taskId = '0xcff9bfb8413a85e5783df27fb58481da2da27502c47d1abebaca31547696fe61';

    const [ message, wasRedeemed ] = await checkHash(hash);

    if (!wasRedeemed) {
        await redeemHash(message, hash, taskId);
    } else {
        console.log('already redeemed');
    }



}

redeemTest();



// main();






