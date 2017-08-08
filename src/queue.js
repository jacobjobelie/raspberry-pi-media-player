const BlueBirdQueue = require('bluebird-queue')
const queue = () => {

  const queue = new BlueBirdQueue({
    concurrency: 1 // optional, how many items to process at a time
  });

  function push(options) {
    queue.add(options);
    //queue.push(options)
  }

  function unshift(options) {
    queue.unshift(options)
  }

  function start() {
    queue.start().then(r => {
      console.log(r);
    })
  }

  return {
    start: start,
    push: push
  }
}
module.exports = queue