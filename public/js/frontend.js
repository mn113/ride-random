/* global Awesomplete, google */

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

function mapGoToPlace() {

}

var gmap;
function initMap() {
    gmap = new google.maps.Map(document.getElementById('gmap'), {
        center: {lat: 51, lng: -3},
        zoom: 3
    });
}
