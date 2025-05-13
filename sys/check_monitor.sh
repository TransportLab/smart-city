#!/bin/bash

# Set DISPLAY and XAUTHORITY for X11 environment
export DISPLAY=:0
export XAUTHORITY=/home/smartcity/.Xauthority

LOGFILE=/opt/logs/monitor_check.log
OUTPUT="HDMI-1"

# Check if the display is asleep
SCREEN_STATE=$(xset -q | grep "Monitor is" | awk '{print $3}')

if [ "$SCREEN_STATE" == "Off" ]; then
    echo "$(date): Monitor is asleep. Attempting to wake." >> $LOGFILE

    curl -i -X POST -H 'Content-Type: application/json' -d '{"text": "'"Smart City installation ${hostname} had its monitor off. Attempting to turn it back on."'"}' https://mattermost.scigem.com/hooks/ubogx1hww3b1dckf4b9di6pmjr

    # Turn off the display using DPMS
    xset dpms force off

    sleep 2

    xset dpms force on
    echo "$(date): Wake signal sent." >> $LOGFILE

    xrandr --output $OUTPUT --auto --mode 3840x2160
else
    echo "$(date): Monitor is active. No action needed." >> $LOGFILE
fi
