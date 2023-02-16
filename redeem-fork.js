const { ethers } = require("ethers");
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');
const { sBeaconABI, redeemABI } = require('./abis.json');

const {
  l1Provider,
  l2Wallet,
  l2Provider
} = require('./state-vars.js');

const storageBeaconAddr = '0xED38F34DA3d19B029d13b575B6bc9B140DA7A92a'; 
const redeemedHashesAddr = '0x22426B8F47d91c306B3BFCFDC83cC168c4f33556'; 
const tasks = {}; 
const URL = 'https://api.thegraph.com/subgraphs/name/gelatodigital/poke-me-goerli';
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

const opsL2 = {
    gasLimit: ethers.BigNumber.from('25000000'),
    gasPrice: ethers.BigNumber.from('25134698068') 
};

process.on('message', async (msg) => {
    console.log('5- received in redeem...')
    const storageBeacon = await hre.ethers.getContractAt(sBeaconABI, storageBeaconAddr); 
    
    let { proxy, owner } = msg;
    let taskId = await storageBeacon.getTaskID(proxy, owner);

    if (!tasks[taskId]) {
        tasks[taskId] = {};
        tasks[taskId].alreadyCheckedHashes = [];
    }

    let result = await axios.post(URL, query(taskId));
    let executions = result.data.data.tasks[0].taskExecutions.filter(exec => exec.success === true);

    parent:
    for (let i=0; i < executions.length; i++) {
        let [ hash ] = executions[i].id.split(':');

        let notInCheckedArray = tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1;
        if (!notInCheckedArray) continue parent;

        let [ message, wasRedeemed ] = await checkHash(hash);

        wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : await redeemHash(message, hash, taskId);
    }
    process.send(true);
});


async function checkHash(hash) { 
    console.log('6- checking hash...');
    const receipt = await l1Provider.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const messages = await l1Receipt.getL1ToL2Messages(l2Wallet);
    const message = messages[0];
    const messageRec = await message.waitForStatus();
    const status = messageRec.status;
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;
    if (wasRedeemed) console.log(`hash redeemed: ${hash}`);

    return [
        message,
        wasRedeemed
    ];
}

async function redeemHash(message, hash, taskId) {
    console.log('redeeming...');
    try {
        let tx = await message.redeem(opsL2);
        await tx.waitForRedeem();
        console.log(`hash: ${hash} redemeed ^^^^^`);
        tasks[taskId].alreadyCheckedHashes.push(hash);
        
        const redeemedHashes = new ethers.Contract(redeemedHashesAddr, redeemABI, l2Provider);
        tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash, opsL2); 
        await tx.wait();
    } catch(e) {
        console.log('error: ', e);
    }
}

