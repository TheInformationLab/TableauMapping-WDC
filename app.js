var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var compression = require('compression');
var timeout = require('connect-timeout');
var fs = require('fs');

var app = express();

if (process.env.NOW) {
  app.use(compression());
}

app.use(timeout(600000));
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

var options = { useNewUrlParser: true, useUnifiedTopology: true };

var dbhost = 'tableaumapping-yi1n8.mongodb.net/tableaumappingmapbox?retryWrites=true&w=majority';
var dbuser = process.env.DBUSER || null;
var dbpass = process.env.DBPASS || null;
var dburi = 'mongodb+srv://';

if (dbuser && dbpass) {
  dburi = dburi + dbuser + ":" + dbpass + '@' + dbhost;
} else {
  dburi = dburi + dbhost;
}
mongoose.set('debug', false);
mongoose.connect(dburi, options);

var appRoutes = require('./routes/app');
var spatialRoutes = require('./routes/spatial');
var statsRoutes = require('./routes/stats');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
    next();
});

app.use('/wdc', appRoutes);
app.use('/wdc/spatial', spatialRoutes);
app.use('/wdc/stats', statsRoutes);
app.use('/wdc/public', express.static('public/wdc'))

module.exports = app;

const { spawn } = require('child_process');
spawn('node', [path.join(__dirname, './func/', 'cache.js')]);
