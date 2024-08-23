#!/bin/bash

npx webpack serve &
npx nodemon --legacy-watch --delay 2.5 src/js/server.js &
# sleep 1
firefox -kiosk http://localhost:8080