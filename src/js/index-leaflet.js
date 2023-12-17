import * as CSS from "../css/main.css";
import 'leaflet/dist/leaflet.css';
import {Lut} from "./Lut.js";

import json_file from "../../params.json5";
import * as L from "leaflet";

import JSON5 from 'json5';

let map;
const urlParams = new URLSearchParams(window.location.search);
let p; // parameters to be loaded from json file
let icons = [];
let lut = new Lut('bwr',32);
lut.setMin(-3);
lut.setMax(3);

fetch("params.json5")
    .then(r => 
        r.text()
    )
    .then((data) => {
        p = JSON5.parse(data);
        init()
    });

function init() {
    let bus_loc = get_bus_locations();
    // console.log(bus_loc);

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
    for ( let i=icons.length-1; i>=0; i--) {
        map.removeLayer(icons[i]);
        icons.pop();
    }  
    
    get_bus_locations()
    .then(data => {
        data.forEach((e) => {
            if ( map.getBounds().contains(new L.LatLng(e.vehicle.position.latitude, e.vehicle.position.longitude)) ) {
                let color;
                // console.log(e)
                // if ( e.congestionLevel == "UNKNOWN_CONGESTION_LEVEL" ) {
                //     color = lut.getColor(0).getHexString();
                // } else {
                // console.log(e.short_route_id)
                // color = lut.getColor(e.vehicle.occupancyStatus).getHexString();
                // }
                
                // console.log('#' + color)
                var icon = L.marker([e.vehicle.position.latitude, e.vehicle.position.longitude], {
                    icon: L.divIcon({
                        className: 'train-icon',
                        html: '<div class="train-icon">T2</div>'
                        // html: '<div class="train-icon" style="background-color: #' + String(color) +'">'+e.short_route_id+'</div>'
                        // html: 'HI!'

                    })
                }); 
                // console.log(icon)   
                // icon._icon.style.color = 'red';
                icon.addTo(map);
                icons.push(icon);
            }
        });
    })
    .catch(error => {
        console.error('Error fetching bus locations:', error);
        // Handle the error
    });
    
    
      
      
    // window.setInterval(() => {
    //     icon._latlng.lat += 0.0001;
    //     icon._latlng.lng += 0.0001;
    //     icon.setLatLng(icon._latlng);
    // }, 100);
    // console.log(icon)
}

function get_bus_locations() {
    return fetch('http://localhost:' + p.server_port + '/update_bus')
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