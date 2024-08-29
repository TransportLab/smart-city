#!/bin/bash

IPADDRESS=$(curl ifconfig.me)

curl -i -X POST -H 'Content-Type: application/json' -d '{"text": "'"Smart City installation ${hostname} has turned back on with IP Address ${IPADDRESS} :tada:"'"}' https://mattermost.scigem.com/hooks/ubogx1hww3b1dckf4b9di6pmjr