#!/bin/bash
# save this as /usr/local/bin/shutdown-webhook.sh
WEBHOOK_URL="https://mattermost.scigem.com/hooks/ubogx1hww3b1dckf4b9di6pmjr"
REASON=$1
curl -X POST -H "Content-Type: application/json" -d "{\"text\": \"Shutdown reason: $REASON\", \"timestamp\": \"$(date)\"}" $WEBHOOK_URL

