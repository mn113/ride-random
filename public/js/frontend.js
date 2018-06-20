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

var gmap;
function initMap() {
    gmap = new google.maps.Map(document.getElementById('gmap'), {
        center: {lat: 51, lng: -3},
        zoom: 3
    });
    // Turn on bicycling layer:
    var bikeLayer = new google.maps.BicyclingLayer();
    bikeLayer.setMap(gmap);
    // Place a marker at user's detected location, or their selected start point:
    var latLng = new google.maps.LatLng(40,0);
    var marker = new google.maps.Marker({
        position: latLng,
        map: gmap
    });
}

function centreMap(place) {
    gmap.center(place);
}

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
