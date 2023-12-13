import * as CSS from "../css/main.css";
import json_file from "../../params.json5";

import JSON5 from 'json5';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { manage_keypress } from './calibrate.js'
import {Lut} from "./Lut.js";

const urlParams = new URLSearchParams(window.location.search);
let p; // parameters to be loaded from json file
let clock, scene, camera, renderer
let line_material, road_material, base_material;
let t_prev = 0;
let sun, base_plane;
let cars = [];
let road_lut = new Lut('grayscale',512);

fetch("params.json5")
    .then(r => 
        r.text()
    )
    .then((data) => {
        p = JSON5.parse(data);
        init()
    });

function init() {

    clock = new THREE.Clock();
    scene = new THREE.Scene();

    var fov_vertical = 2*Math.atan(p.projector_aspect_ratio/p.projector_throw_ratio/2.)*(180/Math.PI); // approx 59 degrees for a 0.5 throw ratio
    camera = new THREE.PerspectiveCamera( fov_vertical, window.innerWidth/window.innerHeight, 0.1, 1000 ); // vertical FOV angle, aspect ratio, near, far

    var ambient_light = new THREE.AmbientLight( 0xFFFFFF ); // white light
    ambient_light.intensity = 0.1;
    scene.add( ambient_light );

    sun = new THREE.PointLight( 0xFFFFFF, 1, 0, 2 ); // white light
    // sun.intensity = 0;
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2*1024;
    sun.shadow.mapSize.height = 2*1024;
    scene.add( sun );

    if ( p.show_sun ) {
        var sunGeometry = new THREE.SphereGeometry( 0.1 ); // radius
        var sunMat = new THREE.MeshStandardMaterial( {
                            emissive: 0xffffee,
                            emissiveIntensity: 1,
                            color: 0x000000
                        } );
        sun.add( new THREE.Mesh( sunGeometry, sunMat ) );
    }

    sun.position.x = 0.5;
    sun.position.y = 0.5;
    sun.position.z = 1;

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );

    if ( urlParams.has('debug') ) {
        console.log(p);
        camera.position.z = 30;
        var controls = new OrbitControls( camera, renderer.domElement );
    }
    else {
        camera.position.z = p.projector_plane_distance_studs;
        camera.position.y = -p.projector_plane_distance_studs/p.projector_throw_ratio/p.projector_aspect_ratio; // vertical offset
    }

    var geometry = new THREE.PlaneGeometry( 2*p.W, 2*p.H,Math.floor(2*p.W*10),Math.floor(2*p.H*10));
    base_material = new THREE.MeshStandardMaterial( {color: 0xFFFFFF, side: THREE.DoubleSide} );
    base_plane = new THREE.Mesh( geometry, base_material );
    base_plane.castShadow = true;
    scene.add( base_plane );

    road_material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        opacity : 0.9,
        side: THREE.DoubleSide,
        transparent: true,
    });

    line_material = new LineMaterial( {
        color: 0xFFFFFF,
        linewidth: 4, // in pixels??????
        dashScale: 5,
        gapSize: 3,
        dashSize: 4
    } );
    line_material.defines.USE_DASH = ""; // enables dashing
    
    scene.background = new THREE.Color( 0x000000 );

    window.addEventListener( 'resize', onWindowResize, false );
    onWindowResize();
    window.addEventListener('keypress', function(e) { manage_keypress(camera,e) });
    
    let bus_loc = get_bus_locations();
    console.log(bus_loc);
    animate();



}

function animate() {
    let dt = clock.getDelta(); 
    let t = clock.getElapsedTime();

    line_material.resolution.set( window.innerWidth, window.innerHeight ); // resolution of the viewport
    // console.log(t - t_prev)
    if(t - t_prev >= p.displacement_map_update_time) { // every 5 seconds
        t_prev = t;
    }

    sun.position.x = 2*p.W*Math.sin(t*2.*Math.PI/p.daily_period);
    sun.position.z = 2*p.W*Math.cos(t*2.*Math.PI/p.daily_period);

    requestAnimationFrame( animate );
    renderer.render( scene, camera );
};

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}


function get_bus_locations() {
    fetch('http://localhost:' + p.server_port + '/update_bus')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        // console.log(response.json())
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('There has been a problem with your fetch operation:', error);
    });
}