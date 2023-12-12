function calibrate_camera() {
    var calibrated = false
    while ( !calibrated ) {

    }
}

function loss(X) {

}

function locate_domain() {
    var threshold = 999
    while ( threshold > 1 ) {
        // project four red circles
        // find them with the camera
        // calculate error between true loc and projected loc
        // optimize... maybe something like this: https://github.com/benfred/fmin
        var solution = fmin.nelderMead(loss, locs);
        // console.log("solution is at " + solution.x);
    }
}

function manage_keypress(camera,e) {
  let key = e.key.toLowerCase();
  let disp = 1;
//   if ( e.altKey  ) { disp *= 10; console.log('ALT') }
  if ( e.ctrlKey  ) { disp *= 10; } // console.log('CTRL') }
  if ( e.shiftKey ) { disp *= 10; } // console.log('SHIFT') }
  
  if      ( key === 'w') { camera.position.y -= 0.01*disp; }
  else if ( key === 'a') { camera.position.x += 0.01*disp; }
  else if ( key === 's') { camera.position.y += 0.01*disp; }
  else if ( key === 'd') { camera.position.x -= 0.01*disp; }
  else if ( key === 'q') { camera.position.z += 0.01*disp; }
  else if ( key === 'e') { camera.position.z -= 0.01*disp; }
  else if ( key === 'r') { camera.rotation.x += 0.001*disp; }
  else if ( key === 'f') { camera.rotation.x -= 0.001*disp; }
  else if ( key === 't') { camera.rotation.y += 0.001*disp; }
  else if ( key === 'g') { camera.rotation.y -= 0.001*disp; }
  else if ( key === 'y') { camera.rotation.z += 0.001*disp; }
  else if ( key === 'h') { camera.rotation.z -= 0.001*disp; }

//   else if ( e.key === 'W') { camera.position.y -= 0.1; }
//   else if ( e.key === 'A') { camera.position.x += 0.1; }
//   else if ( e.key === 'S') { camera.position.y += 0.1; }
//   else if ( e.key === 'D') { camera.position.x -= 0.1; }
//   else if ( e.key === 'Q') { camera.position.z += 0.1; }
//   else if ( e.key === 'E') { camera.position.z -= 0.1; }
//   else if ( e.key === 'R') { camera.rotation.x += 0.01; }
//   else if ( e.key === 'F') { camera.rotation.x -= 0.01; }
//   else if ( e.key === 'T') { camera.rotation.y += 0.01; }
//   else if ( e.key === 'G') { camera.rotation.y -= 0.01; }
//   else if ( e.key === 'Y') { camera.rotation.z += 0.01; }
//   else if ( e.key === 'H') { camera.rotation.z -= 0.01; }

}

export { manage_keypress };
