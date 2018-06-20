/* global Awesomplete, google, axios */

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

var startLoc = {};
var origin = {lat: 56, lng: -3};

// Attempt Geolocation:
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
        origin = {lat: pos.coords.latitude, lng: pos.coords.longitude};
        console.log("Set new location:", origin);
        centreMap(origin);
        markMap(origin);
    }, err => {
        console.log(err);
    }, { // options:
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
}

// Set up Google Map:
var gmap;
function initMap() {
    // locateUser().then() ?
    gmap = new google.maps.Map(document.getElementById('gmap'), {
        center: origin,
        zoom: 5
    });
    gmap.setMapTypeId(google.maps.MapTypeId.ROADMAP);

    // Turn on bicycling layer:
    var bikeLayer = new google.maps.BicyclingLayer();
    bikeLayer.setMap(gmap);
}

function markMap(place) {
    // Place a marker at user's detected location, or their selected start point:
    new google.maps.Marker({
        position: place,
        map: gmap
    });
}

function centreMap(place) {
    gmap.setCenter(new google.maps.LatLng(place));
    gmap.setZoom(8);      // This will trigger a zoom_changed on the map
}


// Set up autocomplete:
var input = document.querySelector("#start");
var awesomplete = new Awesomplete(input);
input.addEventListener('input', () => {
    if (input.value.length < 3) return;
    var ajax = new XMLHttpRequest();
    ajax.open("GET", "/places/" + input.value, true);
    ajax.onload = () => {
        var jsonPlaces = JSON.parse(ajax.responseText);
        console.log(jsonPlaces);
        awesomplete.list = jsonPlaces.map(i => {
            return {label: i.desc, value: i.pid};
        });
        awesomplete.evaluate();
    };
    ajax.send();
});
// Apply user's place selection:
input.addEventListener('awesomplete-selectcomplete', (e) => {
    console.log(e.text);
    startLoc.pid = e.text.value;
    input.value = e.text.label;
    // Start ProcGen
});

document.querySelector('#options').addEventListener('submit', (event) => {
    event.preventDefault();
    requestRoute();
});
// Send AJAX request to server with form options:
function requestRoute() {
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
                drawRoute(response.data);
        })
        .catch(error => {
            console.log(error);
        });
}

// Draw an array of points onto the Google map:
function drawRoute(route) {
    for (var i = 0; i < route.length; i++) {
        var coords = route[i];
        var latLng = new google.maps.LatLng(coords[0],coords[1]);
        var marker = new google.maps.Marker({
            position: latLng,
            map: gmap
        });
    }
    // or...
    /*
    gmap.data.add({
        geometry: new google.maps.Polyline({   InvalidValueError: not a Geometry or LatLng or LatLngLiteral object
            strokeColor: 'red',
            strokeOpacity: 1,
            strokeWeight: 3,
            map: gmap
        })
    });
    */
}
