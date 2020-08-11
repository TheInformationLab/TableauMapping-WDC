var myConnector = tableau.makeConnector();
var tableauVersion = 10.4;

myConnector.init = function(initCallback) {
  var version = tableau.platformVersion;
  var inx = version.lastIndexOf(".");
  var testVersion =  Number(version.substring(0,inx));
  tableauVersion = testVersion;
  console.log("Tableau Desktop Info");
  console.log(tableauVersion);
  console.log(window.location.pathname);
  if (tableauVersion < 10.4 && window.location.pathname == "/wdc/") {
    window.location.assign("/wdc/legacy");
  }
  getLocation(function(location) {
    myConnector.setConnection(location);
    initCallback();
    tableau.submit();
  });
};

myConnector.getSchema = function(schemaCallback) {
  tableau.log("Getting Schema");
  recordStat('getSchema',null,tableau.connectionData, function(resp) {
    tableau.log(resp);
  })
  var settings = {
    "url": "/wdc/spatial/meta",
    "method": "GET",
    "processData": false
  }

  $.ajax(settings).done(function (resp) {
    var ret = [];
    if (tableauVersion >= 10.4) {
      removeLegacyMeta(resp.spatials, function(newLayers) {
        for (var i = 0; i < newLayers.length; i++) {
          var layer = newLayers[i];
          ret.push({
            id: layer._id,
            alias: layer.tableSchema.alias,
            columns: layer.tableSchema.columns
          });
        }
        console.log(ret);
        schemaCallback(ret);
      });
    } else {
      var layers = resp.spatials;
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        ret.push({
          id: layer._id,
          alias: layer.tableSchema.alias,
          columns: layer.tableSchema.columns
        });
      }
      //tableau.log(ret);
      schemaCallback(ret);
    }

  });
};

myConnector.getData = function(table, doneCallback) {
  tableau.log("Getting table " + table.tableInfo.id);
  tableau.reportProgress("Requesting GeoJson");
  recordStat('getData',table.tableInfo.id,tableau.connectionData, function(resp) {
    tableau.log(resp);
  })
  var data = "{ \"id\": \""+table.tableInfo.id+"\" }";
  if (tableauVersion < 10.4) {
    data = "{ \"id\": \""+table.tableInfo.id+"\", \"legacy\": true }";
  }
  var settings = {
    "url": "/wdc/spatial/data",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "processData": false,
    "data": data
  }

  $.ajax(settings).done(function (resp) {
    if (tableauVersion >= 10.4) {
      tableau.reportProgress("Parsing data");
      featureCol2PolygonArr(resp.data, function(data) {
        tableau.reportProgress("Returning data to Tableau");
        table.appendRows(data);
        doneCallback();
      });
    } else {
      tableau.reportProgress("Returning data to Tableau");
      table.appendRows(resp.data);
      doneCallback();
    }

  });
};

myConnector.setConnection = function(location) {
  tableau.connectionName = "TableauMapping.bi";
  tableau.connectionData = JSON.stringify(location);
  tableau.submit();
};

tableau.registerConnector(myConnector);

function findWithAttr(array, attr, value) {
  for(var i = 0; i < array.length; i += 1) {
      if(array[i][attr] === value) {
          return i;
      }
  }
  return -1;
}

var removeLegacyMeta = function(metaArr, callback) {
  for (var i = 0; i < metaArr.length; i++) {
    var cols = metaArr[i].tableSchema.columns;
    cols.splice(findWithAttr(cols, 'id', 'latitude'),1);
    cols.splice(findWithAttr(cols, 'id', 'longitude'),1);
    cols.splice(findWithAttr(cols, 'id', 'polygonId'),1);
    cols.splice(findWithAttr(cols, 'id', 'subPolygonId'),1);
    cols.splice(findWithAttr(cols, 'id', 'path'),1);
    tableau.log(cols);
    cols.push({
      id: "geometry",
      dataType: "geometry",
      alias: "Geometry"
    });
    metaArr[i].tableSchema.columns = cols;
  }
  callback(metaArr);
}

var featureCol2PolygonArr = function(geojson, callback) {
  var features = geojson.features;
  var ret = [];
  for (var i = 0; i < features.length; i++) {
    var obj = features[i].properties;
    obj.geometry = features[i].geometry;
    ret.push(obj);
  }
  callback(ret);
}

var recordStat = function(action, spatial, location, callback) {
  var settings = {
  "url": "/wdc/stats/record",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "processData": false,
  "data": "{\n    \"action\": \""+action+"\",\n    \"spatial\": \""+spatial+"\",\n    \"location\": "+location+"\n  }"
}

$.ajax(settings).done(function (response) {
  callback(response.message);
});
}

var getLocation = function(callback) {
  var settings = {
    "url": "//api.ipify.org?format=json",
    "method": "GET"
  }
  $.ajax(settings).done(function (response) {
    var locSettings = {
      "url": "/wdc/stats/location",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "processData": false,
      "data": JSON.stringify(response)
    }
    $.ajax(locSettings).done(function (resp) {
      callback(resp);
    });
  });
}
