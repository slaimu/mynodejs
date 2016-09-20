const cluster = require('cluster');

const http = require('http');

//###cluster share the same port, not like child process
if (cluster.isMaster) {
  var reqs = 0;

  setInterval( () => {
    console.log('req = ', reqs);
  }, 1000);


  function messageHandler(msg) {
    if (msg.cmd && msg.cmd === 'notifyRequest') {
      
      reqs += 1;
    }
  }


  const numCPUs = require('os').cpus().length;
  for (var i = 0; i < numCPUs; i += 1) {
    cluster.fork();
  }

  Object.keys(cluster.workers).forEach((id) => {
    cluster.workers[id].on('message', messageHandler);
  });
} else {
  http.Server((req, res) => {
    res.writeHead(200);
    res.end('hello world\n');

    process.send({cmd: 'notifyRequest'});

  }).listen(8000);

}

