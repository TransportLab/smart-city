import * as CSS from "../css/main.css";
import 'leaflet/dist/leaflet.css';
import {Lut} from "./Lut.js";

import json_file from "../../params.json5";
import * as L from "leaflet";

import JSON5 from 'json5';

let map;
const urlParams = new URLSearchParams(window.location.search);
let p; // parameters to be loaded from json file
let icons = {};
let lut = new Lut('bwr',32);
lut.setMin(-3);
lut.setMax(3);

let markerHtmlStyle = `
    width: 24px !important;
    height: 24px !important;
    margin-left: -12px;
    margin-top: -12px;
    border-radius: 18px;
    text-align: center;
    font-size: 6px;
    color: white;
    padding: 2px;
    border: 1px solid white;
`

let routes = {
    'NSN' : { // north shore & western line
        label : 'T1', 
        color: '#F99D1C',
    },
    'IWL' : { // inner west & leppington line
        label : 'T2', 
        color: '#0098CD',
    },
    'BNK' : { // bankstown line
        label : 'T3', 
        color: '#F37021',
    },
    'ESI' : { // eastern suburbs & illawarra line
        label : 'T4', 
        color: '#005AA3',
    },
    'CMB' : { // cumberland line
        label : 'T5', 
        color: '#C4258F',
    },
    // there is no T6!
    'OLY' : { // carlingford line
        label : 'T7', 
        color: '#6F818E',
    },
    'APS' : { // airport & south line
        label : 'T8', 
        color: '#00954C',
    }, 
    'NTH' : { // northern line
        label : 'T9', 
        color: '#D11F2F',
    }, 
    // intercity trains
    'BMT' : { // blue mountains line
        label : 'BMT', 
        color: '#F99D1C',
    },
    'CCN' : { // central coast & newcastle line
        label : 'CCN', 
        color: '#D11F2F',
    },
    'HUN' : { // hunter line
        label : 'CCN', 
        color: '#833134',
    },
    'SCO' : { // south coast line
        label : 'SCO',
        color: '#005AA3',
    },
    'IWLR-191' : { // L1 Dulwich Hill Line
        label : 'L1',
        color: '#BE1622',
    },
    '1001_L2' : { // L2 Randwick Line
        label : 'L2',
        color: '#DD1E25',
    },
    '1001_L3' : { // L3 Kingsford Line
        label : 'L3',
        color: '#781140',
    },
}

let ferries = {
    'F1' : { // Manly
        label : 'F1',
        color: '#00774B',
    },
    'F2' : { // Taronga Zoo
        label : 'F2',
        color: '#144734',
    },
    'F3' : { // Parramatta River
        label : 'F3',
        color: '#648C3C',
    },
    'F4' : { // Pyrmont Bay
        label : 'F4',
        color: '#BFD730',
    },
    'F5' : { // Neutral Bay
        label : 'F5',
        color: '#286142',
    },
    'F6' : { // Mosman Bay
        label : 'F6',
        color: '#00AB51',
    },
    'F7' : { // Double Bay
        label : 'F7',
        color: '#00B189',
    },
    'F8' : { // Cockatoo Island
        label : 'F8',
        color: '#55622B',
    },
    'F9' : { // Watsons Bay
        label : 'F9',
        color: '#65B32E',
    },
    'F10' : { // Blackwattle Bay
        label : 'F10',
        color: '#469B3B',
    },
}

fetch("params.json5")
    .then(r => 
        r.text()
    )
    .then((data) => {
        p = JSON5.parse(data);
        init()
    });

function init() {
    // Initialize the map
    map = L.map('map', {
      center: [p.map_center.lat, p.map_center.lng],
      zoom: p.map_zoom,
      attributionControl: false,
      zoomControl : false,
      zoomSnap: 0.01,
    //   scrollWheelZoom: false,
    });
    L.control.attribution({attributionControl: false});//.addTo(map);
  
    
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
            accessToken: keys.mapbox.token
        }).addTo(map);
    });
   

    setInterval(animate, p.update_interval);
}


function animate() {
    // for ( let i=icons.length-1; i>=0; i--) {
    for (let key in icons ) {
        if ( icons[key].updated = false ) {
            map.removeLayer(icons[key]);
            delete icons[key];
        } else {
            icons[key].updated = false;
        }
    };  
    
    p.modes.forEach((mode) => {
        // console.log(mode)
        get_locations(mode)
        .then(data => {
            data.forEach((e) => {
                // console.log(e.vehicle.trip.routeId)
                if ( e.vehicle.position !== undefined ) {
                    if ( map.getBounds().contains(new L.LatLng(e.vehicle.position.latitude, e.vehicle.position.longitude)) ) {
                        if ( e.vehicle.trip.routeId !== undefined ) {
                            let route, color, label;
                            let skip = false;
                            if ( mode === 'sydneytrains' ) {
                                route = e.vehicle.trip.routeId.split('_')[0];
                                if ( route in routes ) {
                                    label = routes[route]['label'];
                                    color = routes[route]['color'];
                                } else {
                                    skip = true;
                                }
                            } else if ( mode === 'buses' ) { 
                                route = e.vehicle.trip.routeId.split('_')[1];
                                color = '#00B5EF';
                                label = route;
                            } else if ( mode === 'ferries/sydneyferries' ) {
                                route = e.vehicle.trip.routeId.split('-')[1];
                                if ( route in ferries ) {
                                    color = ferries[route]['color'];
                                    label = route;
                                } else {
                                    skip = true;
                                }
                            }
                            else { // lightrail
                                route = e.vehicle.trip.routeId
                                if ( route in routes ) {
                                    label = routes[route]['label'];
                                    color = routes[route]['color'];
                                } else {
                                    skip = true;
                                }
                            }
                            // console.log(route)
                            if ( !skip ) {
                                if (e.vehicle.vehicle.id in icons) {
                                    icons[e.vehicle.vehicle.id].setLatLng([e.vehicle.position.latitude, e.vehicle.position.longitude]);
                                } else {
                                    var icon = L.marker([e.vehicle.position.latitude, e.vehicle.position.longitude], {
                                        icon: L.divIcon({
                                            className: '',
                                            html: '<span style="' + markerHtmlStyle + ';background-color:'+color+'">'+label+'</span>'
                                        })
                                    }); 
                                    icon.updated = true;
                                    icons[e.vehicle.vehicle.id] = icon;
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
    
    
      
      
    // window.setInterval(() => {
    //     icon._latlng.lat += 0.0001;
    //     icon._latlng.lng += 0.0001;
    //     icon.setLatLng(icon._latlng);
    // }, 100);
    // console.log(icon)
}

function get_locations(mode) {
    return fetch('http://localhost:' + p.server_port + '/update/' + mode)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Return the parsed JSON
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
            throw error; // Re-throw to propagate the error
        });
}