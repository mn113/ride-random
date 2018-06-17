const fs = require('fs');

const gmapsApiKey = fs.readFileSync('gmaps-apikey.txt');

var googleMapsClient = require('@google/maps').createClient({
  key: gmapsApiKey
});

// Geocode an address.
googleMapsClient.geocode({
  address: '1600 Amphitheatre Parkway, Mountain View, CA'
}, function(err, response) {
  if (!err) {
    console.log(response.json.results);
  }
});


