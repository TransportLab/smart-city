#!/bin/bash

IPADDRESS=$(curl ifconfig.me)

curl -i -X POST -H 'Content-Type: application/json' -d '{"text": "'"Smart City installation ${hostname} has turned back on with IP Address ${IPADDRESS} :tada:"'"}' https://mattermost.scigem.com/hooks/5cwtdg8cupds5n5hiehby75mwe