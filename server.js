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
    var homeCoords = {lat: 51.45269, lng: -2.59757};
    generateRoute(homeCoords)
        .then(route => {
            console.log('Route:', route);
            res.status(200).send(route);
        })
        .catch(err => {
            console.log(err);
            res.status(err.status).send(err);
        });
});

// Start server:
app.listen(3003, () => {
    console.log('App listening on port 3003!');
});

// function toEndOfRoad(segment, point, direction) {} // TODO

// Send AJAX request to Google Places API to get lat & long of place with pid:
function pidToLatLong(pid) {
    // Frontend already does this (google.maps.Geocoder)
    // TODO
}

// Access Google Maps Directions API
// Returns Promise
function getDirections(from, to) {
    return googleMapsClient.directions({
        origin: from,
        destination: to,
        mode: "bicycling",
        avoid: [],
        units: "metric"
    }).asPromise()
        .then((resp) => {
            console.log("Directions status:", resp.json.status);
            if (resp.json.status === "OK") {
                console.log("Directions:", prettyjson.render(resp.json.routes.map((item) => {
                    return {
                        summary: item.summary,
                        distance: item.legs[0].distance.value,
                        steps: item.steps,
                        opp: item.overview_polyline.points
                    };
                })));
            }
        })
        .catch((err) => {
            console.log(err);
        });
}

// Generate a number of random points, constrained to one quadrant around an origin point:
function generatePoints(num, origin, radius, quadrant) {
    var points = [];
    while (points.length < num) {
        // Make one random point inside a square centred on origin:
        var delta;
        var absDelta = {
            lat: Math.abs(radius * Math.random()),
            lng: Math.abs(radius * Math.random())
        };
        // Correct signs for quadrant:
        if (quadrant === 1) delta = absDelta;
        else if (quadrant === 2) delta = {lat: -absDelta.lat, lng: +absDelta.lng};
        else if (quadrant === 3) delta = {lat: -absDelta.lat, lng: -absDelta.lng};
        else if (quadrant === 4) delta = {lat: +absDelta.lat, lng: -absDelta.lng};

        var point = {
            lat: origin.lat + delta.lat,
            lng: origin.lng + delta.lng
        };
        points.push(point);
    }
    console.log("Q", quadrant, points);
    return points;
}

// Distance helper functions:
const km2deg = (km) => km / 111;
//const deg2km = (deg) => deg * 111;


// Generate an entire random route according to the form options:
function generateRoute(start, circ = false, distance = 20, hills = 2) {
    var points = [];
    var radius = km2deg(distance) / 3;
    for (var q = 1; q <= 4; q++) {
        points.push(snapToRoads(generatePoints(3, start, radius, q)));  // Promise
    }
    // Wait for all snapping to complete:
    return Promise.all(points).then(snappedPoints => {
        console.log("SnappedPoints:", snappedPoints);
        // Sort each quadrant of points from origin's nearest to farthest:
        // TODO
        // Use distance matrix to join nearest points?
        // TODO
        getDirections(start, snappedPoints[0][0]).then(dir1 => {
            console.log("Leg 1:", dir1);
        });
        // Flatten:
        var flat = [start, snappedPoints].reduce((arr, val) => arr.concat(val), []);
        console.log("Flat:", flat);
        return flat;
    });
}

// Generate an entire random route according to the form options:
function generateRouteOld(start, circ = false, distance = 20, hills = 2) {
    var points = [[start.lat, start.lng]];
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
    var dy = pb.lat - pa.lat,
        dx = pb.lng - pa.lng;
    return Math.atan2(dy, dx) * 180 / Math.PI;
}

// Generate the next random point on from p using the known vector angle:
function makeNextPoint(p, angle) {
    console.log("p:", p, ", angle:", angle);
    // Let's try 300m steps:
    var hop = km2deg(0.3);
    // Anywhere except the quadrant we just came from:
    var newAngle = angle - 135 + 270 * Math.random();
    var dx = hop * Math.sin(newAngle),
        dy = hop * Math.cos(newAngle);
    return {
        lat: p.lat + dy,
        lng: p.lng + dx
    };
}

// Send AJAX request to Roads API to get back road-accurate points:
function snapToRoads(segment) {
    console.log("Seg to snap:", segment);
    return googleMapsClient.nearestRoads({
        points: segment
    }).asPromise()
        .then(resp => {
            //console.log("Snapped:", prettyjson.render(resp.json));
            var tidyPoints = resp.json.snappedPoints.map(sp => {
                return {
                    lat: sp.location.latitude,
                    lng: sp.location.longitude,
                    pid: sp.placeId
                };
            });
            console.log("tdp", tidyPoints);
            // Remove duplicate points:
            return removeDuplicatePoints(tidyPoints);
        })
        .catch((err) => {
            console.log(err);
        });
}

// Remove excess objects with identical pids from array:
function removeDuplicatePoints(arr) {
    // eslint-disable-next-line no-shadow
    return arr.filter((arr, index, self) =>
        // Allow only the first item with a given pid:
        self.findIndex(p => p.lat === arr.lat && p.lng === arr.lng) === index);
}

function routeToPolyline(route) {

}
