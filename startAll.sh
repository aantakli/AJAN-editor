#!/bin/bash

./startEditor.sh &
./startReportService.sh &
./startTestActionService.sh &

echo "Local IP: "
ip addr show | grep "inet " | awk '{print $2}'
echo "Public IP: "
curl -s checkip.dyndns.org | sed -e 's/.*Current IP Address: //' -e 's/<.*$//'
