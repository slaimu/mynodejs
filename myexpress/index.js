var express = require("express")

var app = express();

var formidable = require('formidable');

var fortune = require('./lib/fortune.js');

var rest = require('connect-rest');
var Attraction = require('./models/attraction.js');

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

var mongoose = require('mongoose');
var opts = {
  server: {
    socketOptions: {keepAlive: 1}
  }
};

var Vacation = require('./models/vacation.js');
Vacation.find(function(err, vacations){
  if(vacations.length) return;
  new Vacation({
    name: 'Hood River Day Trip',
    slug: 'hood-river-day-trip',
    category: 'Day Trip',
    sku: 'HR199',
    description: 'Spend a day sailing on the Columbia and ' +
      'enjoying craft beers in Hood River!',
    priceInCents: 9995,
    tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
    inSeason: true,
    maximumGuests: 16,
    available: true,
    packagesSold: 0,
  }).save();
  new Vacation({
    name: 'Oregon Coast Getaway',
    slug: 'oregon-coast-getaway',
    category: 'Weekend Getaway',
    sku: 'OC39',
    description: 'Enjoy the ocean air and quaint coastal towns!',
    priceInCents: 269995,
    tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
    inSeason: false,
    maximumGuests: 8,
    available: true,
    packagesSold: 0,
  }).save();
  new Vacation({
    name: 'Rock Climbing in Bend',
    slug: 'rock-climbing-in-bend',
    category: 'Adventure',
    sku: 'B99',
    description: 'Experience the thrill of climbing in the high desert.',
    priceInCents: 289995,
    tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing'],
    inSeason: true,
    requiresWaiver: true,
    maximumGuests: 4,
    available: false,
    packagesSold: 0,
    notes: 'The tour guide is currently recovering from a skiing accident.',
  }).save();
});


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
  //mongoose.connect(credentials.mongo.development.connectionString, opts);
  break;
case 'production':
  app.use(require('express-logger')({
    path: __dirname + '/log/requests.log'
  }));
  //mongoose.connect(credentials.mongo.production.connectionString, opts);
  break;
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

app.get('/vacations', function (req, res) {
  Vacation.find({available: true}, function (err, vacations) {
    var context = {
      vacation: vacations.map(function (vacation) {
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          price: vacation.getDisplayPrice(),
          inSeason: vacation.inSeason,
        }
      })
    };
    res.render('vacations', context);
  });
});


app.get('/notify-me-when-in-season', function(req, res){
  res.render('notify-me-when-in-season', { sku: req.query.sku });
});
app.post('/notify-me-when-in-season', function(req, res){
  VacationInSeasonListener.update(
    { email: req.body.email },
    { $push: { skus: req.body.sku } },
    { upsert: true },
    function(err){
      if(err) {
        console.error(err.stack);
        req.session.flash = {
          type: 'danger',
          intro: 'Ooops!',
          message: 'There was an error processing your request.',
        };
        return res.redirect(303, '/vacations');
      }
      req.session.flash = {
        type: 'success',
        intro: 'Thank you!',
        message: 'You will be notified when this vacation is in season.',
      };
      return res.redirect(303, '/vacations');
    }
  );
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




/*
var autoviews = {};
var fs = require('fs');

app.use(function (req, res, next) {
  var path = req.path.toLowerCase();

  if (autoViews[path]) {
    return res.render(autoViews[path]);
  }

  if (fs.existsSync(__dirname + '/views' + path + '.handlebars')) {
    autoViews[path] = path.replace(/^\//, '');
    return res.render(autoViews[paths];
  }
  next();
});

*/



var apiOptions = {
  context: '/api',
  domain: require('domain').create(),
};
var rest_instance = rest.create(apiOptions);
app.use(rest_instance.processRequest());



rest_instance.get('/attractions', function(req, content, cb){
  Attraction.find({ approved: true }, function(err, attractions){
    if(err) return cb({ error: 'Internal error.' });
    cb(null, attractions.map(function(a){
      return {
        name: a.name,
        description: a.description,
        location: a.location,
      };
    }));
  });
});
rest_instance.post('/attraction', function(req, content, cb){
  var a = new Attraction({
    name: req.body.name,
    description: req.body.description,
    location: { lat: req.body.lat, lng: req.body.lng },
    history: {
      event: 'created',
      email: req.body.email,
      date: new Date(),
    },
    approved: false,
  });
  a.save(function(err, a){
    if(err) return cb({ error: 'Unable to add attraction.' });
    cb(null, { id: a._id });
  });
});

rest_instance.get('/attraction/:id', function(req, content, cb){
  Attraction.findById(req.params.id, function(err, a){
    if(err) return cb({ error: 'Unable to retrieve attraction.' });
    cb(null, {
      name: attraction.name,
      description: attraction.description,
      location: attraction.location,
    });
  });
});

apiOptions.domain.on('error', function(err){
  console.log('API domain error.\n', err.stack);
  setTimeout(function(){
    console.log('Server shutting down after API domain error.');
    process.exit(1);
  }, 5000);
  server.close();
  var worker = require('cluster').worker;
  if(worker) worker.disconnect();
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
