const { fork } = require('node:child_process');
const redeemFork = fork('redeem-fork.js');

let proxyQueue;
let turn = true;


process.on('message', (msg) => {
    console.log('3- received in while...');
    proxyQueue = msg;

    if (turn) {
        checkProxyQueue(proxyQueue);
        turn = false;
    }
});

function checkProxyQueue(proxyQueue) {
    if (proxyQueue.proxies.length > 0) {
        proxyQueue.proxies.shift();
        proxy = proxyQueue.deets.shift();
        process.send(true);
        console.log('4- sent...');
        setTimeout(continueExecution, 60000, proxy);
    } else {
        turn = true;
        console.log('THE END');
    }
} 

redeemFork.on('message', (msg) => checkProxyQueue(proxyQueue));

const continueExecution = (proxy) => redeemFork.send(proxy);