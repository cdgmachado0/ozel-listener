const { fork } = require('node:child_process');
const redeemFork = fork('redeem-fork.js');
let finish = true;

process.on('message', (proxyQueue) => {

    while (proxyQueue.length !== 0) {
        console.log('proxyQueue.length in loop: ', proxyQueue.length);
        console.log('finish: ', finish);
        
        if (finish) {
            proxy = proxyQueue.shift();
            setTimeout(continueExecution, 60000, proxy);
            console.log('setTimeout rolling...');
            finish = false;
        }
    }

});

redeemFork.on('message', (msg) => {
    finish = msg;
});

function continueExecution(proxy) {
    redeemFork.send({ proxy });
}