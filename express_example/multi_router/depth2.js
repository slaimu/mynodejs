var app = require('express')();


app.get('/', function (req, res) {
  res.send('Depth2');

});


module.exports = app;
