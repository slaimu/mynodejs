var express = require("express")

var app = express();

var formidable = require('formidable');

var fortune = require('./lib/fortune.js');

var handlebars = require('express3-handlebars')
    .create({
      defaultLayout: 'main',
      helpers: {
        section: function (name, options) {
          if (!this._sections) {
            this._sections = {};
          }
          this._sections[name] = options.fn(this);
          return null;
        }
      }
    });
var credentials = require('./credentials.js');

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(require('cookie-parser')(credentials.cookieSecret));

app.use(express.static(__dirname + '/public'));


app.use(function (req, res, next) {
  if (! res.locals.partials) {
    res.locals.partials = {};
  }
  res.locals.partials.weather = getWeatherData();
  console.log(res.locals.partials.weather);
  next();
});


app.use(function (req, res, next) {
  res.locals.showTests = app.get('env') !== 'production' &&
    req.query.test === '1';
  next();
})

app.use(require('body-parser')());

app.get('/newsletter', function (req, res) {
  res.render('newsletter', {csrf: 'CSRF token goes here' });
});


app.post('/process', function(req, res){
  console.log('Form (from querystring): ' + req.query.form);
  console.log('CSRF token (from hidden form field): ' + req.body._csrf);
  console.log('Name (from visible form field): ' + req.body.name);
  console.log('Email (from visible form field): ' + req.body.email);
  res.redirect(303, '/thank-you');
});



app.get('/contest/vacation-photo',function(req,res){
  var now = new Date();
  res.render('contest/vacation-photo',{
    year: now.getFullYear(),month: now.getMonth()
  });
});
app.post('/contest/vacation-photo/:year/:month', function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    if(err) return res.redirect(303, '/error');
    console.log('received fields:');
    console.log(fields);
    console.log('received files:');
    console.log(files);
    res.redirect(303, '/thank-you');
  });
});



app.get('/', function (req, res) {
  res.cookie('monster', 'nom nom');
  res.cookie('signed_monster', 'nom nom', {signed: true});
  console.log(req.cookies.monster);
  console.log(req.signedCookies.signed_monster);
  res.render('home');
});


app.get('/about', function (req, res) {
  res.render('about', {
    testArray: fortune.getFortune(),
    pageTestScript: '/qa/tests-about.js'
  });
});


app.get('/tours/hood-river', function (req, res) {
  res.render('tours/hood-river');
});

app.get('/tours/request-group-rate', function (req, res) {
  res.render('tours/request-group-rate');
});

app.get('/jquerytest', function (req, res) {
  res.render('jquerytest');
});


app.get('/nursery-rhyme', function (req, res) {
  res.render('nursery-rhyme');
});


app.get('/data/nursery-rhyme', function (req, res) {
  res.json({
    animal: 'squirrel',
    bodyPart:  'tail',
    adjective: 'bushy',
    noun: 'heck'
  });
});

app.use(function (req, res) {
  res.status(404)
  res.render('404');
  
});



app.use(function (err, req, res, next) {
  console.log(err.stack);
  res.status(500)
  res.render('500');
});


app.listen(app.get('port'), function () {
  console.log('Express started on http://localhost:' + app.get('port') +
              '; press Ctrl + C to terminate');
});


function getWeatherData(){
  return {
    locations: [
      {
        name: 'Portland',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
        weather: 'Overcast',
        temp: '54.1 F (12.3 C)',
      },
      {
        name: 'Bend',
        forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
        weather: 'Partly Cloudy',
        temp: '55.0 F (12.8 C)',
      },
      {
        name: 'Manzanita',
        forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
        weather: 'Light Rain',
        temp: '55.0 F (12.8 C)',
      },
    ],
  };
}
