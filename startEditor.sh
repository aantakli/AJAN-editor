#!/bin/bash


node npm/node_modules/ember-cli/bin/ember clean-tmp & node npm/node_modules/ember-cli/bin/ember serve 

echo "Local IP: "
ip addr show | grep "inet " | awk '{print $2}'
echo "Public IP: "
curl -s checkip.dyndns.org | sed -e 's/.*Current IP Address: //' -e 's/<.*$//'
