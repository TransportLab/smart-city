import * as CSS from "../css/main.css";
import 'leaflet/dist/leaflet.css';
import { Lut } from "./Lut.js";

import json_file from "../../params.json5";
import * as L from "leaflet";

import JSON5 from 'json5';

function logger(msg, level = 'info') {
    // Validate the level
    const validLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLevels.includes(level)) {
        console.error('Invalid log level:', level);
        return;
    }

    // Use default port if p or p.server.port is undefined
    const port = (p && p.server && p.server.port) ? p.server.port : 3000;

    fetch('http://localhost:' + port + '/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: msg, level: level }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            console.log('Message logged on the server:', data.message);
        } else if (data.error) {
            console.error('Error from server:', data.error);
        }
    })
    .catch(error => {
        console.error('Error logging message:', error);
    });
}


let map;
const urlParams = new URLSearchParams(window.location.search);
let p; // parameters to be loaded from json file
let vehicles = {};
let ships = {};
let planes = {};
let lut = new Lut('bwr', 32);
lut.setMin(-3);
lut.setMax(3);
if (urlParams.has('debug')) {
    var debug = true;
} else {
    var debug = false;
}
let imageOverlay;

let routes = {
    'NSN': { // north shore & western line
        label: 'T1',
        color: '#F99D1C',
    },
    'IWL': { // inner west & leppington line
        label: 'T2',
        color: '#0098CD',
    },
    'T3': { // bankstown line
        label: 'T3',
        color: '#F37021',
    },
    'BNK': { // bankstown line
        label: 'T3',
        color: '#F37021',
    },
    'ESI': { // eastern suburbs & illawarra line
        label: 'T4',
        color: '#005AA3',
    },
    'CMB': { // cumberland line
        label: 'T5',
        color: '#C4258F',
    },
    // there is no T6!
    'OLY': { // carlingford line
        label: 'T7',
        color: '#6F818E',
    },
    'APS': { // airport & south line
        label: 'T8',
        color: '#00954C',
    },
    'NTH': { // northern line
        label: 'T9',
        color: '#D11F2F',
    },
    // intercity trains
    'BMT': { // blue mountains line
        label: 'BMT',
        color: '#F99D1C',
    },
    'CCN': { // central coast & newcastle line
        label: 'CCN',
        color: '#D11F2F',
    },
    'HUN': { // hunter line
        label: 'CCN',
        color: '#833134',
    },
    'SCO': { // south coast line
        label: 'SCO',
        color: '#005AA3',
    },
    'IWLR-191': { // L1 Dulwich Hill Line
        label: 'L1',
        color: '#BE1622',
    },
    '1001_L2': { // L2 Randwick Line
        label: 'L2',
        color: '#DD1E25',
    },
    '1001_L3': { // L3 Kingsford Line
        label: 'L3',
        color: '#781140',
    },
}

let ferries = {
    'F1': { // Manly
        label: 'F1',
        color: '#00774B',
    },
    'F2': { // Taronga Zoo
        label: 'F2',
        color: '#144734',
    },
    'F3': { // Parramatta River
        label: 'F3',
        color: '#648C3C',
    },
    'F4': { // Pyrmont Bay
        label: 'F4',
        color: '#BFD730',
    },
    'F5': { // Neutral Bay
        label: 'F5',
        color: '#286142',
    },
    'F6': { // Mosman Bay
        label: 'F6',
        color: '#00AB51',
    },
    'F7': { // Double Bay
        label: 'F7',
        color: '#00B189',
    },
    'F8': { // Cockatoo Island
        label: 'F8',
        color: '#55622B',
    },
    'F9': { // Watsons Bay
        label: 'F9',
        color: '#65B32E',
    },
    'F10': { // Blackwattle Bay
        label: 'F10',
        color: '#469B3B',
    },
}

let ferry_names = [
    'John Nutt', 'Frances Bodkin', 'Kurt Fearnley', 'Lauren Jackson', 'Liz Ellis', 'Cheryl Salisbury', 'Ethel Turner', 'Ruth Park', 'Olive Cotton', 'Margaret Olley', 'Esme Timbery', 'Ruby Langford', 'Fairlight', 'Clontarf', 'Balmoral', 'Me&#8209;mel', 'Catherine Hamlin', 'Fred Hollows', 'Victor Chang', 'Pemulwuy', 'Bungaree', 'Birrabirragal', 'Bulane', 'Burraneer', 'May Gibbs', 'Sirius', 'Supply', 'Freshwater', 'Fishburn', 'Borrowdale', 'Scarborough', 'Friendship', 'Marjorie Jackson', 'Golden Grove', 'Marlene Mathews', 'Evonne Goolagong', 'Dawn Fraser', 'Betty Cuthbert', 'Collaroy', 'Shane Gould', 'Alexander', 'Queenscliff', 'Charlotte', 'Nicole Livingstone'
];
ferry_names = ferry_names.map(str => str.toUpperCase().replace(/ /g, '&nbsp;')); // make uppercase and replace spaces with non-breaking spaces


fetch('params.json5')
    .then(response => response.text())
    .then(data => {
        p = JSON5.parse(data);
        init();
    })
    .catch(error => {
        console.error('Error fetching or parsing params.json5:', error);
    });


function init() {
    document.documentElement.style.setProperty('--aspect-ratio', String(p.model.width / p.model.height)); // Set a new aspect ratio
    document.documentElement.style.setProperty('--v-offset', String(p.projector.vertical_offset) + 'px'); // Set a new max height
    document.documentElement.style.setProperty('--h-scale', String(p.projector.horizontal_scale)); // Set a new max height


    let bounds = L.latLngBounds(
        L.latLng(p.model.corners.sw.lat, p.model.corners.sw.lng),
        L.latLng(p.model.corners.ne.lat, p.model.corners.ne.lng)
    );
    let center = bounds.getCenter();

    // Initialize the map
    map = L.map('map', {
        center: center,
        zoom: 13,// initial guess, will be fixed later
        attributionControl: false,
        zoomControl: false,
        zoomSnap: 0,
        //   scrollWheelZoom: false,
    });

    // check bounds are applied nicely
    if (debug) {
        L.rectangle(bounds, { color: "#ff7800", weight: 3 }).addTo(map);
        console.log('New map bounds:', map.getBounds());
        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();
        var width = ne.lng - sw.lng;
        var height = ne.lat - sw.lat;
        console.log('Aspect ratio:', width / height);

    }
    document.addEventListener('keypress', handleKeyPress);

    map.fitBounds(bounds, true);
    // map.setView(center, map.getZoom());
    L.control.attribution({ attributionControl: false });//.addTo(map);

    fetch("keys.json5")
        .then(r =>
            r.text()
        )
        .then((data) => {
            let keys = JSON5.parse(data);
            L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
                // attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a> | <a href="https://www.tandfonline.com/doi/pdf/10.1080/00022470.1978.10470720">Gaussian Plume Model</a> | Brought together by <a href="https://www.benjymarks.com">Benjy Marks</a>',
                maxZoom: 22,
                id: keys.mapbox.id,
                tileSize: 512,
                zoomOffset: -1,
                zoomSnap: 0,
                accessToken: keys.mapbox.token
            }).addTo(map);
        })
        .catch(error => {
            logger('Error fetching or parsing keys.json5: ' + error.message, 'error');
        });


    setInterval(animate, p.gtfs.update_interval);
    setInterval(animate, p.gtfs2.update_interval);

    if (p.radar.show) {
        setInterval(function () {
            update_radar();
        }, p.radar.update_interval);
    }

    if (p.flights.show) {
        update_flights();
        setInterval(function () {
            update_flights();
        }, p.flights.update_interval);
    }

    logger("Current p: " + JSON.stringify(p), "info");
    if (p.logo.show) {
        // logger("Asking to render logo", "info");
        render_logo();
    }


}


function animate() {
    for (let key in vehicles) {
        if (Date.now() - vehicles[key].updated > 150000) {
            // console.log('Removing stale vehicle: ' + key)
            map.removeLayer(vehicles[key]);
            delete vehicles[key];
        }
    };

    if (p.gtfs.show) {
        update_gtfs();
    }
    if (p.gtfs2.show) {
        update_gtfs2();
    }
    if (p.ais.show) {
        update_ships();
    }
    if (p.hazards.show) {
        update_hazards();
    }
}

function update_gtfs() {
    p.gtfs.modes.forEach((mode) => {
        get_gtfs(mode)
            .then(data => {
                data.forEach((e) => {
                    if (e.vehicle.position !== undefined) {
                        if (map.getBounds().contains(new L.LatLng(e.vehicle.position.latitude, e.vehicle.position.longitude))) {
                            if (e.vehicle.trip.routeId !== undefined) {
                                let route, color, label;
                                let skip = false;
                                if (mode === 'sydneytrains') {
                                    route = e.vehicle.trip.routeId.split('_')[0];
                                    if (route in routes) {
                                        label = routes[route]['label'];
                                        color = routes[route]['color'];
                                    } else {
                                        logger("Did not find a matching route for: " + route, "debug");
                                        skip = true;
                                    }
                                } else if (mode === 'metro') {
                                    route = e.vehicle.trip.routeId;
                                    // skip = true;
                                    color = '#00FF00';
                                    label = "M1";
                                } else if (mode === 'buses') {
                                    route = e.vehicle.trip.routeId.split('_')[1];
                                    color = '#00B5EF';
                                    label = route;
                                } else if (mode === 'ferries/sydneyferries') {
                                    route = e.vehicle.trip.routeId.split('-')[1];
                                    if (route in ferries) {
                                        color = ferries[route]['color'];
                                        label = route;
                                    } else {
                                        skip = true;
                                    }
                                }
                                else { // lightrail
                                    route = e.vehicle.trip.routeId
                                    if (route in routes) {
                                        label = routes[route]['label'];
                                        color = routes[route]['color'];
                                    } else {
                                        skip = true;
                                    }
                                }
                                // console.log(route)
                                if (!skip) {
                                    if (e.vehicle.vehicle.id in vehicles) {
                                        vehicles[e.vehicle.vehicle.id].setLatLng([e.vehicle.position.latitude, e.vehicle.position.longitude]);
                                    } else {
                                        var icon = L.marker([e.vehicle.position.latitude, e.vehicle.position.longitude], {
                                            icon: L.divIcon({
                                                className: '',
                                                html: '<span class="gtfs" style="background-color:' + color + '">' + label + '</span>'
                                            })
                                        });
                                        icon.updated = e.vehicle.timestamp * 1000;
                                        vehicles[e.vehicle.vehicle.id] = icon;
                                        icon.addTo(map);
                                    }
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                logger('Error fetching locations: ' + JSON.stringify(error), "error");
            });
    });
}

function update_gtfs2() {
    p.gtfs2.modes.forEach((mode) => {
        get_gtfs2(mode)
            .then(data => {
                data.forEach((e) => {
                    if (e.vehicle.position !== undefined) {
                        if (map.getBounds().contains(new L.LatLng(e.vehicle.position.latitude, e.vehicle.position.longitude))) {
                            if (e.vehicle.trip.routeId !== undefined) {
                                let route, color, label;
                                let skip = false;
                                if (mode === 'sydneytrains') {
                                    route = e.vehicle.trip.routeId.split('_')[0];
                                    if (route in routes) {
                                        label = routes[route]['label'];
                                        color = routes[route]['color'];
                                    } else {
                                        skip = true;
                                    }
                                } else if (mode === 'metro') {
                                    console.log(e.vehicle.trip)
                                    route = e.vehicle.trip.routeId.split('_')[1];
                                    color = '#168388';
                                    label = route;
                                } else if (mode === 'buses') {
                                    route = e.vehicle.trip.routeId.split('_')[1];
                                    color = '#00B5EF';
                                    label = route;
                                } else if (mode === 'ferries/sydneyferries') {
                                    route = e.vehicle.trip.routeId.split('-')[1];
                                    if (route in ferries) {
                                        color = ferries[route]['color'];
                                        label = route;
                                    } else {
                                        skip = true;
                                    }
                                }
                                else { // lightrail
                                    route = e.vehicle.trip.routeId
                                    if (route in routes) {
                                        label = routes[route]['label'];
                                        color = routes[route]['color'];
                                    } else {
                                        skip = true;
                                    }
                                }
                                // console.log(route)
                                if (!skip) {
                                    if (e.vehicle.vehicle.id in vehicles) {
                                        vehicles[e.vehicle.vehicle.id].setLatLng([e.vehicle.position.latitude, e.vehicle.position.longitude]);
                                    } else {
                                        var icon = L.marker([e.vehicle.position.latitude, e.vehicle.position.longitude], {
                                            icon: L.divIcon({
                                                className: '',
                                                html: '<span class="gtfs" style="background-color:' + color + '">' + label + '</span>'
                                            })
                                        });
                                        icon.updated = e.vehicle.timestamp * 1000;
                                        vehicles[e.vehicle.vehicle.id] = icon;
                                        icon.addTo(map);
                                    }
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching locations:', error);
                // Handle the error
            });
    });
}


function update_ships() {
    get_ships().then(new_ships => {
        if (new_ships === null || new_ships === undefined) {
            return;
        }
        for (const [key, e] of Object.entries(new_ships)) {
            if (map.getBounds().contains(new L.LatLng(e.lat, e.lon))) {
                if (!ferry_names.includes(key)) {
                    if (key in ships) {
                        ships[key].setLatLng([e.lat, e.lon]);
                        ships[key].updated = e.updated;
                    } else {
                        var icon = L.marker([e.lat, e.lon], {
                            icon: L.divIcon({
                                className: '',
                                html: '<span class="ship" id="' + key + '">' + key + '</span>'
                            })
                        });
                        icon.updated = e.updated;
                        ships[key] = icon;
                        icon.addTo(map);
                    }
                    let el = document.getElementById(key);
                    if (el !== null) { // wait for element to exist 
                        var newRotation = 'rotate(' + parseInt(parseFloat(e.angle) - 90) + 'deg)';
                        var currentTransform = window.getComputedStyle(el.parentElement).transform;
                        if (currentTransform === 'none') {
                            currentTransform = ''; // Set to an empty string if no transform has been applied
                        }
                        el.parentElement.style.transform = currentTransform + ' ' + newRotation;
                        el.parentElement.style.transformOrigin = 'center';
                    }
                }
            }
        }
    });
}

function update_flights() {
    get_flights().then(res => {
        // console.log(res.states);
        // if (res.states === null ) {
        // res.states = [[0,0,0,0,0,151.200,-33.860,0,0,0,120]];
        // }
        if (res.states !== null) {
            for (const [key, value] of Object.entries(planes)) {
                map.removeLayer(planes[key]);
                delete planes[key];
                logger('Removing flight: ' + key, "debug");
            }
            res.states.forEach((state, index) => {
                let callsign = state[1];
                let lng = state[5];
                let lat = state[6];
                let angle = state[10];
                let category = state[17];
                let svg_path;

                if (category == 8) { // rotorcraft
                    svg_path = '../../resources/helicopter.svg';
                } else {
                    svg_path = '../../resources/plane.svg';
                }

                var icon = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'plane',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20],
                        zIndexOffset: 1000, // make sure it's on top of everything
                        html: '<img src="' + svg_path + '" style="transform: rotate(' + String(angle) + 'deg);"><div>' + callsign + '</div>'
                    })
                });
                planes[index] = icon;
                icon.addTo(map);
            });

        }
    });
}

function update_hazards() {
    // console.log('HAZARDS');
    // `p.hazards.modes.forEach((mode) => {
    //     console.log(mode)
    //     get_hazards(mode).then(locs => {
    //         console.log(locs);
    //     });
    // });`
}

function get_gtfs(mode) {
    return fetch('http://localhost:' + p.server.port + '/update_gtfs/' + mode)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Return the parsed JSON
        })
        .catch(error => {
            logger('Error fetching gtfs: ' + JSON.stringify(error), "error");
        });
}

function get_gtfs2(mode) {
    return fetch('http://localhost:' + p.server.port + '/update_gtfs2/' + mode)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Return the parsed JSON
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
            // throw error; // Re-throw to propagate the error
        });
}

function get_ships() {
    return fetch('http://localhost:' + p.server.port + '/update_ships/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Return the parsed JSON
        })
        .catch(error => {
            logger('Error fetching ships: ' + JSON.stringify(error), "error");
        });
}

function get_flights() {
    return fetch('http://localhost:' + p.server.port + '/update_flights/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Return the parsed JSON
        })
        .catch(error => {
            logger('Error fetching flights: ' + JSON.stringify(error), "error");
            return { states: null };
        });
}

function get_hazards(mode) {
    return fetch('http://localhost:' + p.server.port + '/update_hazards/' + mode)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Return the parsed JSON
        })
        .catch(error => {
            logger('Error fetching hazards: ' + JSON.stringify(error), "error");
        });
}



setInterval(function () {
    remove_old_ships(ships);
}, 10000);

function remove_old_ships(ships) {
    let now = Date.now();
    for (const [key, value] of Object.entries(ships)) {
        if (now - Date.parse(value.updated) > 300000) { // remove older than 5 mins (should refresh at least once every 3 mins)
            map.removeLayer(ships[key]);
            delete ships[key];
            console.log('Removing: ' + key)
        }
    }
}

function update_radar() {
    fetch('http://localhost:' + p.server.port + '/update_radar/')
        .then(response => {
            if (debug) { console.log('Got radar server response: ', response.status) }
            if (response.ok) { // Check if response status is 200
                return response.blob();
            }
        })
        .then(blob => {
            if (debug) { console.log('Got radar image blob:', blob); }
            const imageUrl = URL.createObjectURL(blob);
            if (imageOverlay) {
                // Update the existing ImageOverlay
                imageOverlay.setUrl(imageUrl);
            } else {
                let latLngBounds = L.latLngBounds(p.radar.bounds); // hard coded bounds for radar image :(

                imageOverlay = L.imageOverlay(imageUrl, latLngBounds, {
                    opacity: p.radar.opacity,
                }).addTo(map);
            }
        })
        .catch(error => {
            logger('Error fetching radar: ' + JSON.stringify(error), "error");
        });
}

function render_logo() {
    logger('Asking server for: http://localhost:' + p.server.port + '/' + p.logo.image, "info");
    fetch('http://localhost:' + p.server.port + '/' + p.logo.image)
        .then(response => {
            logger('Got logo response: ' + response.status, "info");
            if (response.ok) { 
                return response.blob();
            }
        })
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            let latLngBounds = L.latLngBounds([
                [p.logo.loc.lat - p.logo.size, p.logo.loc.lng - p.logo.size],
                [p.logo.loc.lat + p.logo.size, p.logo.loc.lng + p.logo.size]
            ]);
            // L.rectangle(latLngBounds, {color: "#ff7800", weight: 3}).addTo(map);

            L.imageOverlay(imageUrl, latLngBounds, {
                opacity: p.logo.opacity,
            }).addTo(map);
        })
        .catch(error => {
            logger('Error fetching logo: ' + JSON.stringify(error), "error");
        });
}


function handleKeyPress(event) {
    let currentZoom = map.getZoom();

    if (event.key == 'w') {
        map.setZoom(currentZoom + 0.001);
    } else if (event.key == 's') {
        map.setZoom(currentZoom - 0.001);
    } else if (event.key == 'W') {
        map.setZoom(currentZoom + 0.01);
    } else if (event.key == 'S') {
        map.setZoom(currentZoom - 0.01);
    } else if (event.key == 'a') {
        p.projector.horizontal_scale += 0.001;
    } else if (event.key == 'd') {
        p.projector.horizontal_scale -= 0.001;
    }
    
    document.documentElement.style.setProperty('--h-scale', String(p.projector.horizontal_scale)); // Set a new max height
    logger('New map zoom ' + String(map.getZoom() + ' Bounds: ' + JSON.stringify(map.getBounds())));
    logger('Horizontal scale: ' + String(p.projector.horizontal_scale))

}