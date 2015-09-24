// ChileSismos: muestra los últimos ocurridos en Chile con datos de la USGS
// Original Code: Tyler Weimin Ouyang (github.com/tylerwowen/pebblequake), ouyang@cs.ucsb.edu

var UI = require('ui');
var splashWindow = new UI.Card({
    title: "ChileSismos",
    icon: "images/mini_icon.png",
    body: "Cargando datos..."
});
splashWindow.show();

var ajax = require('ajax');
var Vibe = require('ui/vibe');

var parseFeed = function(data, quantity) {
  var items = [];
  for(var i = 0; i < quantity; i++) {
    var mag = 'Magnitud ' + data.results.sismos[i].mag;

    // Get date/time substring
    var timestamp_raw = data.results.sismos[i].fecha.text;
    var timestamp = timestamp_raw.split(" ");
    var date = timestamp[0];
    var time = timestamp[1];
    // Add to menu items array
    items.push({
      title:mag,
      subtitle:date+" "+time
    });
  }

  // Finally return whole array
  return items;
};

// Make request to CSN
var query = "http://www.kimonolabs.com/api/9pzf9xze?apikey=e7TfDrOfQBQ42qtX6xTwg0D6sy6a9dJS";

// Get user's location
var locationOptions = {
  enableHighAccuracy: true, 
  maximumAge: 10000, 
  timeout: 10000
};
var userLat;
var userLon;

function locationSuccess(pos) {
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  userLat = pos.coords.latitude;
  userLon = pos.coords.longitude;
}

function locationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
}

// Make an asynchronous request
navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);

// Calculate distance
function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
  ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

ajax(
  {
    url: query,
    type:'json'
  },
  function(data) {
    // Create an array of Menu items
    var menuItems = parseFeed(data, 10);

    // Construct Menu to show to user
    var resultsMenu = new UI.Menu({
      sections: [{
        title: 'Ultimos Terremotos',
        items: menuItems,
      }]
    });

    // Add an action for SELECT
    resultsMenu.on('select', function(e) {
      // Get that forecast
      var properties = data.results.sismos[e.itemIndex];
      var eqLat = properties.lat;
      var eqLon = properties.lon;
      var dist = Math.round(getDistanceFromLatLonInKm(userLat,userLon,eqLat,eqLon)) + ' km';
      var prof = properties.prof;
      var ref = properties.ref;

      var details = [
          {
              title:"Magnitud",
              subtitle:properties.mag
          },
          {
              title:"Fecha y Hora",
              subtitle:e.item.subtitle
          },
          {
              title:"Ref. Geográfica",
              subtitle:ref
          },
          {
              title: "Profundidad",
              subtitle: prof + ' km'
          },
          {
              title:"Distancia",
              subtitle:dist
          },
          {
              title:"Latitud y Longitud",
              subtitle:eqLat.substr(1) + '°S, ' + eqLon.substr(1) + '°W'
          }
          
          
      ];  
      var detailMenu = new UI.Menu({
          sections: [{
              title: 'Detalles',
              items: details,
          }]
      });
      detailMenu.show();
    });

    // Show the Menu, hide the splash
    resultsMenu.show();
    splashWindow.hide();

    // Register for setinterval
    var cycle = function() {
      // Make another request to 
      ajax(
        {
          url: query,
          type:'json'
        },
        // success
        function(data)  {
          var newItems = parseFeed(data, 10);
          if (newItems[0].subtitle != menuItems[0].subtitle) {
            // Update the Menu's first section
            splashWindow.hide();
            resultsMenu.items(0, newItems);
            resultsMenu.show();
            Vibe.vibrate('double');
          }
          else{
            console.log('5 min');
          }
        },
        // failure      
        function(error) {
          console.log('Download failed: ' + error);
        }
      );
    };
    cycle();
    setInterval(cycle, 5 * 60 * 1000);

    resultsMenu.on('longSelect', function(e){
      splashWindow.show();
      ajax(
        {
          url: query,
          type:'json'
        },
        // success
        function(data)  {
          var newItems = parseFeed(data, 10);
          if (newItems[0].subtitle != menuItems[0].subtitle) {
            // Update the Menu's first section
            splashWindow.hide();
            resultsMenu.items(0, newItems);
            resultsMenu.show();
            Vibe.vibrate('double');
          }
          else{
            console.log('no updates');
            resultsMenu.show();
            splashWindow.hide();
          }
        },
        // failure      
        function(error) {
          console.log('Download failed: ' + error);
        }
      );
    });

  },
  function(error) {
    console.log("Download failed: " + error);
  }
);
