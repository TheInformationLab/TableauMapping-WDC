var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Stat = require('../models/stat');
var request = require("request");

router.post('/location', function(req, res, next) {
  if (req.body.ip && req.body.ip != 'null') {
    var options = { method: 'GET',
      url: 'http://api.ipstack.com/' + req.body.ip,
      qs: { access_key: '67d90f241ff91d334ffff340a7cdc469' }
    };
    console.log(options);
    request(options, function (error, response, body) {
      if (error) {
        return res.status(500).json({
          message: 'Error getting location',
          error: error
        });
      }
      res.status(201).json(body);
    });
  }
});

router.post('/record', function(req, res, next) {
  if (req.body.spatial != 'null' && req.body.location != '{}') {
    var stat = new Stat({
      action: req.body.action,
      spatial: mongoose.Types.ObjectId(req.body.spatial),
      location: req.body.location
    });
  } else if (req.body.location != '{}'){
    var stat = new Stat({
      action: req.body.action,
      location: req.body.location
    });
  } else {
    var stat = new Stat({
      action: req.body.action
    });
  }
  stat.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        message: 'Error storing '+req.body.action+' stat',
        error: err
      });
    }
    res.status(201).json({
      message: req.body.action + ' stat stored'
    });
  });
});

module.exports = router;
