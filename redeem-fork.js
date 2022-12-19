const { ethers } = require("ethers");
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

const storageBeaconAddr = '0xDf2956dB0E0c283d2cd7eB27ecBDaBBdEe329516'; 
const redeemedHashesAddr = '0xBAa20c48292C4Be9319dA3E7620F4364aac498b4'; 
const tasks = {}; 
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



process.on('message', async (msg) => {
    console.log('entered redeem-fork.js +++++')
    const storageBeacon = await hre.ethers.getContractAt(sBeaconABI, storageBeaconAddr); //<--- put this elsewhere so it runs once

    let { proxy } = msg;
    let taskId = await storageBeacon.getTaskID(proxy);

    if (!tasks[taskId]) {
        tasks[taskId] = {};
        tasks[taskId].alreadyCheckedHashes = [];
    }

    let result = await axios.post(URL, query(taskId));
    let executions = result.data.data.tasks[0].taskExecutions.filter(exec => exec.success === true);
    // console.log('executions: ', executions);

    parent:
    for (let i=0; i < executions.length; i++) {
        let [ hash ] = executions[i].id.split(':');
        console.log('hash to check: ', hash);

        let notInCheckedArray = tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1;
        if (!notInCheckedArray) continue parent;

        let [ message, wasRedeemed ] = await checkHash(hash);

        wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : await redeemHash(message, hash, taskId);
        // finish = true;
    }
    process.send(true); //<----- send the proxy here instead of true
    console.log('msg sent from redeem-fork...');
});


async function checkHash(hash) { 
  console.log('checking...');
  const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
  const l1Receipt = new L1TransactionReceipt(receipt);
  const messages = await l1Receipt.getL1ToL2Messages(l2Wallet);
  const message = messages[0];
  const messageRec = await message.waitForStatus();
  const status = messageRec.status;
  const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;
  console.log('hash checked...');

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
      
      const redeemedHashes = new ethers.Contract(redeemedHashesAddr, redeemABI, l2ProviderTestnet); //<--- this one too
      tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash); 
      await tx.wait();
  } catch {}
}



//-------------------------


// async function redeemHash(message, hash, taskId) {
//   console.log('redeeming...');
//   redeemQueue.push(hash);
//   console.log(`Added to the redeem queue: ${hash}`);

//   let redeemed;
//   let i = 0;

//   while (redeemQueue.length !== 0) { 
//       let hashToRedeem = redeemQueue[i];
//       redeemed = await redeem(message, hashToRedeem, taskId);
//       if (redeemed) {
//           index = redeemQueue.indexOf(hashToRedeem);
//           redeemQueue.splice(index, 1);
//           i = 0;
//       } else {
//           i = i + 1 > redeemQueue.length ? 0 : i++;
//       }
//   }

//   return true;
// } 

// async function redeem(message, hash, taskId) {
//   try {
//       let tx = await message.redeem(ops);
//       await tx.waitForRedeem();
//       console.log(`hash: ${hash} redemeed ^^^^^`);
//       tasks[taskId].alreadyCheckedHashes.push(hash);
      
//       const redeemedHashes = new ethers.Contract(redeemedHashesAddr, redeemABI, l2ProviderTestnet);
//       tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash); 
//       await tx.wait();

//       return true;
//   } catch {}
// }
