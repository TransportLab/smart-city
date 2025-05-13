#!/bin/bash

# Set the correct resolution for the projector
xrandr --output HDMI-1 --mode 3840x2160

npx webpack serve &
npx nodemon --legacy-watch --delay 2.5 src/js/server.js &
# sleep 1
firefox -kiosk http://localhost:8080
