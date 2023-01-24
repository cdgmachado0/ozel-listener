const { ethers } = require("ethers");
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');
const { sBeaconABI, redeemABI } = require('./abis.json');

const {
  l1Provider,
  l2Wallet,
  l2Provider
} = require('./state-vars.js');

const storageBeaconAddr = '0xC495aE737ec10cBea741c52F0DcF54856985A621'; 
const redeemedHashesAddr = '0x9a128E96CfCB6D4c2cc88B3775a33818a81D5927'; 
const tasks = {}; 
const URL = 'https://api.thegraph.com/subgraphs/name/gelatodigital/poke-me';
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



process.on('message', async (msg) => {
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
  const receipt = await l1Provider.getTransactionReceipt(hash);
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
        let tx = await message.redeem();
        await tx.waitForRedeem();
        console.log(`hash: ${hash} redemeed ^^^^^`);
        tasks[taskId].alreadyCheckedHashes.push(hash);
        
        const redeemedHashes = new ethers.Contract(redeemedHashesAddr, redeemABI, l2Provider);
        tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash); 
        await tx.wait();
    } catch(e) {
        console.log('error: ', e);
    }
}

