var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Spatial = require('../models/spatial');

router.get('/', function (req, res) {
    res.render('wdc');
});

router.get('/legacy', function (req, res) {
    res.render('legacy');
});

module.exports = router;
