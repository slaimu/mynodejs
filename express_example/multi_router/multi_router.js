var app = require('express')();


app.use('/depth1', require('./depth1'));

app.get('/', function (req, res) {
  res.send('Root');
});


app.listen(3000);
