const EventEmitter = require('events');

const emitter = new EventEmitter();

emitter.on('event1', () => {
  console.log('event1 occurred');

  emitter.on('event2', () => {
    console.log('event2 occurred');
  });
});

emitter.emit('event1');
emitter.emit('event2');
