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

var nodemailer = require('nodemailer');
var credentials = require('./credentials.js');


var mailTransport = nodemailer.createTransport('SMTP', {
  service: 'Gmail',
  auth: {
    user: credentials.gmail.user,
    pass: credentials.gmail.password
  }
});



mailTransport.sendMail(
  {
    form: 'xiaowu.zhangv@gmail.com',
    to: 'xiaowu.zhangv@gmail.com',
    subject: 'mail test',
    text: 'mail test'
  },
  function (err) {
    if (err) {
      console.error('unable to send email:' + err);
    }
  }
);

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(function (req, res, next) {
  var domain = require('domain').create();
  domain.on('error', function (err) {
    console.error('Domain Error Caught\n', err.stack);
    try {
      setTimeout(function () {
        console.error('Failsafe shutdown.');
        process.exit(1);
      }, 5000);
      var worker = require('cluster').worker;
      if (worker) {
        work.disconnect();
      }
      server.close();
      try {
        next(err);
      } catch(err) {
        console.error('Express error mechanism failed.\n', err.stack);
        req.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.end('Server error');
      };
    } catch (err) {
      console.error('Unable to send 500 response.\n', err.stack);
    }
  });
  domain.add(req);
  domain.add(res);
  domain.run(next);
});



app.use(require('cookie-parser')(credentials.cookieSecret));

app.use(express.static(__dirname + '/public'));


switch(app.get('env')) {
case 'development':
  app.use(require('morgan')('dev'));
  break;
case 'production':
  app.use(require('express-logger')({
    path: __dirname + '/log/requests.log'
  }));
}


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


app.use(function (req, res, next) {
  var cluster = require('cluster');
  if (cluster.isWorker) {
    console.log('worker %d received request', cluster.worker.id);
  }
  next();
});


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




app.post('/cart/checkout', function(req, res){
  var cart = req.session.cart;
  if(!cart) next(new Error('Cart does not exist.'));
  var name = req.body.name || '', email = req.body.email || '';
  if(!email.match(VALID_EMAIL_REGEX))
    return res.next(new Error('Invalid email address.'));
  cart.number = Math.random().toString().replace(/^0\.0*/, '');
  cart.billing = {
    name: name,
    email: email,
  };
  res.render('email/cart-thank-you',
             { layout: null, cart: cart }, function(err,html){
               if( err ) console.log('error in email template');
               mailTransport.sendMail({
                 from: '"Meadowlark Travel": info@meadowlarktravel.com',
                 to: cart.billing.email,
                 subject: 'Thank You for Book your Trip with Meadowlark',
                 html: html,
                 generateTextFromHtml: true
               }, function(err){
                 if(err) console.error('Unable to send confirmation: '
                                       + err.stack);
               });
             }
            );
  res.render('cart-thank-you', { cart: cart });
});



app.get('/', function (req, res) {
  res.cookie('monster', 'nom nom');
  res.cookie('signed_monster', 'nom nom', {signed: true});
  console.log(req.cookies.monster);
  console.log(req.signedCookies.signed_monster);
  res.render('home');
});



app.get('/fail', function (req, res) {
  throw new Error('Nope!');
});

app.get('/epic-fail', function (req, res) {
  process.nextTick(function () {
    throw new Error('kaboom!');
  });
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

function startServer() {
  app.listen(app.get('port'), function () {
    console.log('Express started in ' + app.get('env') +
                ' mode on http://localhost:' + app.get('port') +
                '; press Ctrl + C to terminate');
  });
}


if (require.main === module) {
  startServer();
} else {
  module.exports = startServer;
}


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
