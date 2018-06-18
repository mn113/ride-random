const fs = require('fs');
const prettyjson = require('prettyjson');
const express = require('express');

const app = express();

// Serve static files:
app.use(express.static('public'));

// Test:
app.get('/hw', (req, res) => {
    res.send('Hello World!');
});

// Start server:
app.listen(3003, () => {
    console.log('Example app listening on port 3003!');
});

// Set up client:
const gmapsApiKey = fs.readFileSync('gmaps-apikey.txt');
var googleMapsClient = require('@google/maps').createClient({
    key: gmapsApiKey
});

// Geocode an address.
googleMapsClient.geocode({
    address: 'Bristol, UK'
}, (err, response) => {
    if (!err) {
        console.log(prettyjson.render(response.json.results));
    }
});

var homeCoords = [51.454513,-2.58791];

function lookupPlace(typing) {

}

function genPoint(last, nextlast) {

}

function snapPoint(point) {

}

function toEndOfRoad(segment, point, direction) {

}

function calcDist(a, b) {

}
