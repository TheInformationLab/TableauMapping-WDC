var express = require('express');
var router = express.Router();
var path = require("path");
var fs = require('fs');
var mapbox = require('../func/mapbox');
var mongoose = require('mongoose');
var compression = require('compression');
var Spatial = require('../models/spatial');
var turf = require('@turf/turf');
require('../models/user');

router.get('/meta', function(req, res) {
  Spatial.find({"name": { $ne: "The Information Lab" }, "isPublic": { $eq: true}})
    .select('bbox continent country dateCreated name owner sourceDate sourceUrl type tableSchema')
    .populate({
      path: 'owner',
      select: {
        company: 1,
        firstName: 1,
        lastName: 1,
        _id: 0
      }
    })
    .exec(function (err, spatials) {
    if (err) {
      res.status(500).json({
        message: 'Error finding spatial objects',
        error: err
      });
      return;
    }
    res.status(201).json({
      message: 'Result',
      spatials: spatials
    });
  });
});

var getData = function(id, callback) {
  Spatial.findById(mongoose.Types.ObjectId(id))
         .populate({
           path: 'owner'
         })
         .exec(function (err, resp) {
            mapbox.getDataset(resp.mapboxid, resp.owner.mapboxUsername, resp.owner.mapboxAccessToken, function(geojson) {
              callback(null, geojson);
            });
          });
}

router.post('/data', function(req, res) {
  Spatial.findById(mongoose.Types.ObjectId(req.body.id))
    .populate({
      path: 'owner',
      select: {
        company: 1,
        firstName: 1,
        lastName: 1,
        _id: 0
      }
    })
    .exec(function (err, obj) {
      if (err) {
        return res.status(404).json({
          message: 'Data not found',
          error: err
        });
      }
      fs.readFile('/tmp/data/' + req.body.id, 'utf8', function (fileErr, geojson) {
        if(fileErr) {
          getData(req.body.id, function(getDataErr, resp) {
            if (getDataErr) {
              console.log(getDataErr);
            }
            fs.writeFile('/tmp/data/' + req.body.id, JSON.stringify(resp), 'utf8', function(writeErr) {
              if (writeErr) {
                console.log(writeErr);
              }
              if (req.body.legacy) {
                geojsonConversion(resp, function(data) {
                  res.status(201).json({
                    message: 'Data found',
                    meta: obj,
                    data: data
                  });
                });
              } else {
                res.status(201).json({
                  message: 'Data found',
                  meta: obj,
                  data: resp
                });
              }
            });
          });
        } else {
          console.log(req.body.legacy);
          if (req.body.legacy) {
            geojsonConversion(JSON.parse(geojson), function(data) {
              res.status(201).json({
                message: 'Data found',
                meta: obj,
                data: data
              });
            });
          } else {
            res.status(201).json({
              message: 'Data found',
              meta: obj,
              data: JSON.parse(geojson)
            });
          }
        }
      });
    });
});

module.exports = router;

var geojsonConversion = function(geojson, callback) {
  var ret = [];
  console.log(geojson);
  turf.coordEach(geojson, function (currentCoord, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) {
    var obj = {};
    obj.longitude = currentCoord[0];
    obj.latitude = currentCoord[1];
    obj.path = coordIndex;
    obj.polygonId = featureIndex;
    obj.subPolygonId = geometryIndex;
    var features = geojson.features[featureIndex];
    var headers = Object.keys(features.properties);
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      obj[header] = features.properties[header];
    }
    ret.push(obj);
  });
  callback(ret);
}
