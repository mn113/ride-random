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
            startInput.value = event.text.label;
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
            // locateUser().then() ?
            gmap = new google.maps.Map(document.getElementById('gmap'), {
                center: origin,
                zoom: 5
            });
            gmap.setMapTypeId(google.maps.MapTypeId.ROADMAP);

            // Turn on bicycling layer:
            var bikeLayer = new google.maps.BicyclingLayer();
            bikeLayer.setMap(gmap);
        },

        // Draw an array of points onto the Google map:
        drawRoute: function(route) {
            console.log("mapping.drawRoute called");
            for (var i = 0; i < route.length; i++) {
                var coords = route[i];
                var latLng = new google.maps.LatLng(coords[0],coords[1]);
                new google.maps.Marker({
                    position: latLng,
                    map: gmap
                });
            }
            // or...
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
        },

        // Geocoding (placeId to latLng):
        geocodePlaceId: function(pid) {
            console.log("mapping.geocodePlaceId called");
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({placeId: pid}, (results, status) => {
                if (status === 'OK') {
                    if (results[0]) {
                        startLoc.lat = results[0].geometry.location.latitude;
                        startLoc.lng = results[0].geometry.location.longitude;
                        mapping.centreMap(startLoc);
                        mapping.markMap(startLoc);
                    }
                } else {
                    console.log('Geocoder failed due to:', status);
                }
            });
        },

        // Attempt Geolocation:
        locateUser: function() {
            console.log("mapping.locateUser called");
            if (navigator.geolocation) {
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

        centreMap: function(place) {
            gmap.setCenter(new google.maps.LatLng(place));
            gmap.setZoom(8);      // This will trigger a zoom_changed on the map
        },

        markMap: function(place) {
            // Place a marker at user's detected location, or their selected start point:
            new google.maps.Marker({
                position: place,
                map: gmap
            });
        }
    };

    // Reveal publicly:
    return {
        gmap: gmap,
        init: init,
        io: io,
        mapping: mapping
    };
}());
