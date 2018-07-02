/* global Awesomplete, google, axios */

// Set up Service Worker:
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/js/worker.js', {scope: '/js/'})
        .then(reg => {
            // registration worked
            console.log('Registration succeeded. Scope is ' + reg.scope);
        }).catch(error => {
            // registration failed
            console.log('Registration failed with ' + error);
        });
}


// Revealing Module pattern:
// eslint-disable-next-line no-unused-vars
var rideRandom = (function() {
    var gmap;
    var origin = {lat: 56, lng: -3};
    var startLoc = {};
    var startInput = document.querySelector("#start");
    var optionsForm = document.querySelector('#options');
    var awesomplete = new Awesomplete(startInput);

    var init = function() {
        console.log("init called");
        mapping.initMap();

        // Set up autocomplete:
        startInput.addEventListener('input', io.suggestPlaces);

        // Apply user's place selection:
        startInput.addEventListener('awesomplete-selectcomplete', (event) => {
            console.log(event.text);
            startLoc.pid = event.text.value;
            startLoc.name = event.text.label;
            startInput.value = event.text.label;
            // Geocode this location to get lat/lng:
            mapping.geocodePlaceId(startLoc.pid);
        });

        // "Generate" Button:
        optionsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            io.requestRoute();
        });
    };

    var io = {
        suggestPlaces: function() {
            console.log("io.suggestPlaces called");
            if (startInput.value.length < 3) return;
            var ajax = new XMLHttpRequest();
            ajax.open("GET", "/places/" + startInput.value, true);
            ajax.onload = () => {
                var jsonPlaces = JSON.parse(ajax.responseText);
                console.log(jsonPlaces);
                awesomplete.list = jsonPlaces.map(i => {
                    return {label: i.desc, value: i.pid};
                });
                awesomplete.evaluate();
            };
            ajax.send();
        },

        // Send AJAX request to server with form options:
        requestRoute: function() {
            console.log("io.requestRoute called");
            // Serialize the form:
            var options = {
                place: startLoc,
                circular: document.querySelector('#circular').value,
                distance: document.querySelector('#distance').value,
                hills: document.querySelector('#hills').value
            };
            console.log(options);
            // AJAX it:
            axios.post('/newRoute', options)
                .then(response => {
                    console.log(response);
                    if (response.data && response.data.length > 1)
                        mapping.drawRoute(response.data);
                })
                .catch(error => {
                    console.log(error);
                });
        }
    };

    var mapping = {
        // Set up Google Map:
        initMap: function() {
            console.log("mapping.initMap called");
            gmap = new google.maps.Map(document.getElementById('gmap'), {
                center: origin,
                zoom: 5
            });
            gmap.setMapTypeId(google.maps.MapTypeId.ROADMAP);

            // Turn on bicycling layer:
            var bikeLayer = new google.maps.BicyclingLayer();
            bikeLayer.setMap(gmap);

            mapping.locateUser();
        },

        // Attempt Geolocation:
        locateUser: function() {
            console.log("mapping.locateUser called");
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(pos => {
                    origin = {lat: pos.coords.latitude, lng: pos.coords.longitude};
                    console.log("Set new location:", origin);
                    mapping.centreMap(origin);
                    mapping.markMap(origin);
                }, err => {
                    console.log(err);
                }, { // options:
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            }
        },

        // Geocoding (placeId to latLng):
        geocodePlaceId: function(pid) {
            console.log("mapping.geocodePlaceId called with", pid);
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({placeId: pid}, (results, status) => {
                if (status === 'OK') {
                    if (results[0]) {
                        //console.log(results[0].geometry.location);
                        startLoc.lat = results[0].geometry.location.lat();
                        startLoc.lng = results[0].geometry.location.lng();
                        mapping.centreMap(startLoc);
                        mapping.markMap(startLoc);
                    }
                } else {
                    console.log('Geocoder failed due to:', status);
                }
            });
        },

        centreMap: function(place) {
            gmap.setCenter(new google.maps.LatLng(place));
            gmap.setZoom(8);      // This will trigger a zoom_changed on the map
        },

        markMap: function(place, icon = null) {
            var icons = {
                start: {
                    path: 'M-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0',
                    fillColor: 'green',
                    fillOpacity: 1,
                    strokeColor: 'black',
                    strokeWeight: 3,
                    scale: 1,
                    size: new google.maps.Size(8, 8),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(4, 4)
                },
                finish: {
                    //path: google.maps.SymbolPath.CIRCLE,
                    path: 'M-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0',
                    fillColor: 'red',
                    fillOpacity: 1,
                    strokeColor: 'black',
                    strokeWeight: 3,
                    scale: 1,
                    size: new google.maps.Size(8, 8),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(4, 4)
                }
            };
            // Place a marker at user's detected location, or their selected start point:
            new google.maps.Marker({
                position: new google.maps.LatLng(place),
                map: gmap,
                icon: icon ? icons[icon] : null
            });
            console.log("marked");
        },

        // Draw an array of points onto the Google map:
        drawRoute: function(route) {
            console.log("mapping.drawRoute called");
            /*for (var i = 0; i < route.length; i++) {
                new google.maps.Marker({
                    position: new google.maps.LatLng(route[i]),
                    map: gmap
                });
            }
            */
            // or...
            var flightPath = new google.maps.Polyline({
                path: route,
                //geodesic: true,
                strokeColor: 'orange',
                strokeOpacity: 1,
                strokeWeight: 2,
                map: gmap
            });
            mapping.markMap(route[route.length - 1], 'finish');
            mapping.markMap(route[0], 'start');

            //flightPath.setMap(gmap);
            /*
            gmap.data.add({
                geometry: new google.maps.Polyline({
                ^ InvalidValueError: not a Geometry or LatLng or LatLngLiteral object
                    strokeColor: 'red',
                    strokeOpacity: 1,
                    strokeWeight: 3,
                    map: gmap
                })
            });
            */
        }
    };

    // Reveal publicly:
    return {
        gmap: gmap,
        startLoc: startLoc,
        init: init,
        io: io,
        mapping: mapping
    };
}());
