var app = require('express').Router();

app.use('/depth2', require('./depth2'));

app.get('/', function (req, res) {
  res.send('Depth1');
});

module.exports = app;
