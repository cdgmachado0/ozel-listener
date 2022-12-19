const { fork } = require('node:child_process');
const redeemFork = fork('redeem-fork.js');
let finish = true;
let proxyQueue;
let turn = true;

process.on('message', (msg) => {

    // while (proxyQueue.length !== 0) {
    //     console.log('proxyQueue.length in loop: ', proxyQueue.length);
    //     console.log('finish: ', finish);
        
    //     if (finish) {
    //         proxy = proxyQueue.shift();
    //         setTimeout(continueExecution, 60000, proxy);
    //         console.log('setTimeout rolling...');
    //         finish = false;
    //     }
    // }

    //-------
    proxyQueue = msg;
    console.log('proxyQueue in while fork: ', proxyQueue);

    if (turn) {
        console.log('went to if turn ^^^^');
        checkProxyQueue(proxyQueue);
        turn = false;
    }

    // redeemFork.on('message', (proxy) => { 
    //     // if (msg == true) {
    //         console.log('received msg from redeem-fork *****');
    //         console.log('proxy received: ', proxy);
    //         console.log('proxyQueue in on from redeem-fork: ', proxyQueue);
    //         checkProxyQueue(proxyQueue); 
    //     // }
    // });

});

// redeemFork.on('message', (msg) => { 
//     finish = msg;
// });

function continueExecution(proxy) { 
    console.log('proxy in continueExec: ', proxy); 
    console.log('proxyQueue in continueExec: ', proxyQueue);
    redeemFork.send({ proxy });
}

function checkProxyQueue(proxyQueue) {
    if (proxyQueue.length > 0) {
        proxy = proxyQueue.shift();
        process.send(true);
        console.log('proxyQueue after shift: ', proxyQueue);    
        setTimeout(continueExecution, 60000, proxy);
        console.log('setTimeout rolling...');
    } else {
        console.log('THE END');
        turn = true;
    }
} 


redeemFork.on('message', (proxy) => { 
    // if (msg == true) {
        console.log('received msg from redeem-fork *****');
        console.log('proxy received: ', proxy);
        console.log('proxyQueue in on from redeem-fork: ', proxyQueue);
        checkProxyQueue(proxyQueue); 
    // }
});