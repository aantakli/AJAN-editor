#!/bin/bash

NODE_VERSION=$(command -v node)
if [ -z "$NODE_VERSION" ]; then
  echo "Node.js is not installed."
else
  NODE_VERSION=$(node -v)
  if [[ $NODE_VERSION == v8.6.0* ]]; then
    ./startEditor.sh &
    ./startReportService.sh &
    ./startTestActionService.sh &
    python3 app/services/carjan/server/carla-connection.py &
     echo "Local IP: "
     ip addr show | grep "inet " | awk '{print $2}'
     echo "Public IP: "
     curl -s checkip.dyndns.org | sed -e 's/.*Current IP Address: //' -e 's/<.*$//'
  else
    echo "Node.js 8.6.0 is not installed. The current version is $NODE_VERSION"
  fi
fi
