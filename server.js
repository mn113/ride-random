const fs = require('fs');
const prettyjson = require('prettyjson');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Set up client:
const gmapsApiKey = fs.readFileSync('gmaps-apikey.txt', 'utf-8').trim();
const googleMapsClient = require('@google/maps').createClient({key: gmapsApiKey, Promise: Promise});

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
            //console.log(prettyjson.render(resp.json.predictions));
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
/*app.get('/nearRoads/:lat,:long', (req, res) => {
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
*/
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

// Process frontend request for new route:
app.post('/newRoute', (req, res) => {
    console.log('Req.body:', prettyjson.render(req.body));
    // NOT ACTUALLY USING REQUEST FROM HERE ON
    var homeCoords = {lat: 51.45269, long: -2.59757};
    generateRoute(homeCoords)
        .then(route => {
            console.log('Route:', route);
            res.status(200).send(route);
        });
});

// Start server:
app.listen(3003, () => {
    console.log('App listening on port 3003!');
});

// function toEndOfRoad(segment, point, direction) {} // TODO

// Send AJAX request to Google Places API to get lat & long of place with pid:
function pidToLatLong(pid) {
    // TODO
}

// Generate an entire random route according to the form options:
function generateRoute(start, circ = false, distance = 20, hills = 2) {
    var points = [[start.lat, start.long]];
    var n = 3;
    // WHILE LOOP IS WRONG IDEA, BECAUSE ALL LOOPS COMPLETE BEFORE FIRST Promise
    // MAYBE A PROMISE INSIDE A GENERATOR?
    while (n > 0) {
        var segment = makeSegment(5, points[points.length - 1]);
        snapToRoads(segment)
        // eslint-disable-next-line no-loop-func
            .then(snappedSeg => {
                points = points.concat(snappedSeg);
            });
        n--;
        if (n === 0) return Promise.resolve(points);
    }
}

// Generate a segment of consecutive random points:
function makeSegment(numPoints, firstPoint) {
    var segment = [firstPoint];
    while (numPoints > 0) {
        var nextPoint;
        if (segment.length < 2) {
            nextPoint = makeNextPoint(segment[segment.length - 1], 360 * Math.random());
        }
        else {
            var nextAngle = getAngle(segment[segment.length - 2], segment[segment.length - 1]);
            nextPoint = makeNextPoint(segment[segment.length - 1], nextAngle);
        }
        console.log("NextPoint:", nextPoint);
        segment.push(nextPoint);
        //console.log("Seg", segment);
        numPoints--;
    }
    console.log('Segment:', segment);
    return segment;
}

// Find the angle of the vector from point A to point B:
function getAngle(pa, pb) {
    console.log("pa:", pa, ", pb:", pb);
    // Note: [lat,long] converts to [y,x] for trig
    var dy = pb[0] - pa[0],
        dx = pb[1] - pa[1];
    return Math.atan2(dy, dx) * 180 / Math.PI;
}

// Generate the next random point on from p using the known vector angle:
function makeNextPoint(p, angle) {
    console.log("p:", p, ", angle:", angle);
    // Let's try 300m steps:
    var h = 0.003;
    // Anywhere except the quadrant we just came from:
    var newAngle = angle - 135 + 270 * Math.random();
    var dx = h * Math.sin(newAngle),
        dy = h * Math.cos(newAngle);
    return [p[0] + dx, p[1] + dy];
}

// Send AJAX request to Roads API to get back road-accurate points:
function snapToRoads(segment) {
    return googleMapsClient.nearestRoads({
        points: segment
    }).asPromise()
        .then((resp) => {
            console.log("Snapped:", prettyjson.render(resp.json));
            return resp.json.snappedPoints.map(sp => [sp.location.latitude, sp.location.longitude]);
        })
        .catch((err) => {
            console.log(err);
        });
}

function routeToPolyline(route) {

}
