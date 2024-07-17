const express = require('express');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 4203;

//initialize a simple http server
const server = http.createServer(app);
let running = null;

let response = "<http://localhost:4203/post> <http://localhost:4203/ajan-demo-ns#message>  <http://localhost:4203/ajan-demo-ns#Received> .";
let blocked = "<http://localhost:4203/post> <http://localhost:4203/ajan-demo-ns#message>  <http://localhost:4203/ajan-demo-ns#Blocked> .";
const wss = new WebSocket.Server({ server });

app.use(bodyParser.text({ type: 'text/plain', limit: '50mb' }));
app.use(bodyParser.text({ type: 'text/turtle', limit: '50mb' }));
app.use(bodyParser.text({ type: 'text/xml', limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/json', limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/ld+json', limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/sparql-results+xml', limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/trig', limit: '50mb' }));
app.use(bodyParser());
app.use(function (err, req, res, next) {
  console.error(err.stack);
});

app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/pickUp', (req, res) => {
  let wssMessage = JSON.parse(req.body);
  console.log(req.body);
  let action = createAction(wssMessage, "pickUp");
  action.asyncResponse = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n PREFIX ajan: <http://www.ajan.de/ajan-ns#> \n PREFIX actn: <http://www.ajan.de/actn#> \n PREFIX strips: <http://www.ajan.de/behavior/strips-ns#> \n \n <" + action.block + "> strips:is ajan:Holding.";
  let actionRequest = JSON.stringify(action);
  wss.clients.forEach(client => {
    client.send(actionRequest);
  });
  res.set('Content-Type', 'text/turtle');
  res.send(response);
});

app.post('/putDown', (req, res) => {
  let wssMessage = JSON.parse(req.body);
  console.log(req.body);
  wss.clients.forEach(client => {
    client.send(createAction(wssMessage, "putDown"));
  });
  res.set('Content-Type', 'text/turtle');
  res.send(wssMessage);
});

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    if (running == message) {
      running = null;
      console.log("done!");
    }
  });

  ws.on("error", (err) => {
    console.log("Caught flash policy server socket error: ");
    console.log(err.stack);
    running = null;
  });

  sendConnectMessage(ws);
});

server.listen(port, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

function sendConnectMessage(ws) {
  let wssMessage = {};
  wssMessage.body = "You are now connected to the AJAN Demo Service (ajanDemoService.js)!";
  ws.send(JSON.stringify(wssMessage));
}

function createAction(wssMessage, actionType) {
  let action = { "action": actionType };
  wssMessage.forEach((entry) => {
    if(entry["http://www.ajan.de/actn#asyncRequestURI"] != null) {
      console.log(entry["http://www.ajan.de/actn#asyncRequestURI"][0]["@id"]);
      action.requestURI = entry["http://www.ajan.de/actn#asyncRequestURI"][0]["@id"];
    }
    if(entry["@type"] == "http://www.ajan.de/ajan-ns#Block") {
        action.block = entry["@id"];
    }
  });
  return action;
}
