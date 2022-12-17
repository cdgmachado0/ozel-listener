
process.on('message', async (msg) => {
  let { proxy } = msg;

  let taskId = await storageBeacon.getTaskID(proxy);

  if (!tasks[taskId]) {
      tasks[taskId] = {};
      tasks[taskId].alreadyCheckedHashes = [];
  }

  let result = await axios.post(URL, query(taskId));

  let executions = result.data.data.tasks[0].taskExecutions.filter(exec => exec.success === true);
  console.log('executions: ', executions);

  parent:
  for (let i=0; i < executions.length; i++) {
      let [ hash ] = executions[i].id.split(':');
      // console.log('hash to check: ', hash);

      let notInCheckedArray = tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1;
      if (!notInCheckedArray) continue parent;

      let [ message, wasRedeemed ] = await checkHash(hash);

      wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : await redeemHash(message, hash, taskId);
      // finish = true;
      process.send(true);
  }

});


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
  redeemQueue.push(hash);
  console.log(`Added to the redeem queue: ${hash}`);

  let redeemed;
  let i = 0;

  while (redeemQueue.length !== 0) { 
      let hashToRedeem = redeemQueue[i];
      redeemed = await redeem(message, hashToRedeem, taskId);
      if (redeemed) {
          index = redeemQueue.indexOf(hashToRedeem);
          redeemQueue.splice(index, 1);
          i = 0;
      } else {
          i = i + 1 > redeemQueue.length ? 0 : i++;
      }
  }

  return true;
} 

async function redeem(message, hash, taskId) {
  try {
      let tx = await message.redeem(ops);
      await tx.waitForRedeem();
      console.log(`hash: ${hash} redemeed ^^^^^`);
      tasks[taskId].alreadyCheckedHashes.push(hash);
      
      const redeemedHashes = new ethers.Contract(redeemedHashesAddr, redeemABI, l2ProviderTestnet);
      tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash); 
      await tx.wait();

      return true;
  } catch {}
}
