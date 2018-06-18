const fs = require('fs');
const prettyjson = require('prettyjson');
const express = require('express');

const app = express();

// Set up client:
const gmapsApiKey = fs.readFileSync('gmaps-apikey.txt', 'utf-8').trim();
const googleMapsClient = require('@google/maps').createClient({key: gmapsApiKey});

console.log(gmapsApiKey);
console.log(googleMapsClient);

// Serve static files:
app.use(express.static('public'));


/*
 * Express routes: a series of server endpoints the front-end script will query
 * to cause the back-end to make Google Maps API requests.
 * https://maps.googleapis.com/maps/api/place/nearbysearch/json? - [OK, USEFUL?]
 * https://maps.googleapis.com/maps/api/geocode/json? - NOT WORKS BUG
 * https://maps.googleapis.com/maps/api/place/autocomplete/json? [OK]
 * https://roads.googleapis.com/v1/nearestRoads?points=60.1,24.9|60.2,24.8|60.3,24.7 [OK]
 * https://maps.googleapis.com/maps/api/distancematrix/json? units=imperial&origins=Washington,DC&destinations=New+York+City,NY [OK]
 * https://maps.googleapis.com/maps/api/elevation/json?locations=39.7,-104.9 [OK]
 */

// Geocode an address:
app.get('/geocode', (req, res) => {
    googleMapsClient.geocode({address: 'Bristol, UK'}, (err, response) => {
        if (!err) {
            console.log(prettyjson.render(response.json.results));
        }
        else {
            console.log(err);   // <-- API key not allowed with this API
        }
    });

    res.status(200).send('Geocode of Bristol, UK');
});

// Autocomplete placename: [OK]
app.get('/places/:typing', (req, res) => {
    googleMapsClient.placesAutoComplete({input: req.params.typing}, (err, resp) => {
        if (!err) {
            console.log(prettyjson.render(resp.json.predictions));
            res.status(200)
                .send(resp.json.predictions.map(json => {
                    return {
                        desc: json.description,
                        pid: json.place_id
                    };
                }));
        }
        else {
            console.log(err);
        }
    });
});

// Snap points to road (requires at least 2 points):    FIXME work with series of points
app.get('/nearRoads/:lat,:long', (req, res) => {
    googleMapsClient.nearestRoads({
        points: [parseFloat(req.params.lat), parseFloat(req.params.long)]
    }, (err, resp) => {
        if (!err) {
            console.log(resp.json);
            res.status(200).send('Nearest road: ' + resp.json);
        }
        else {
            console.log(err);
        }
    });
});

// Get distance from A to B: [OK]
app.get('/distance/:from/:to', (req, res) => {
    googleMapsClient.distanceMatrix({
        origins: req.params.from,
        destinations: req.params.to
    }, (err, resp) => {
        if (!err) {
            console.log(resp.json);
            res.status(200).send(resp.json.rows[0].elements[0].distance.value);
        }
        else {
            console.log(err);
        }
    });
});

// Get elevation of a point: [OK]
app.get('/elevation/:lat,:long', (req, res) => {
    console.log(req.params);
    googleMapsClient.elevation({
        locations: [[parseFloat(req.params.lat), parseFloat(req.params.long)]]
    }, (err, resp) => {
        if (!err) {
            console.log(resp.json);
            res.status(200).send('Elev: ' + resp.json.results[0].elevation);
        }
        else {
            console.log(err);
        }
    });
});


// Start server:
app.listen(3003, () => {
    console.log('App listening on port 3003!');
});

//var homeCoords = [51.454513,-2.58791];
/*
// Fetch autocomplete suggestions for a placename:
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
*/
