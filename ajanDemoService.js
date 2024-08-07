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

app.get('/initScene', (req, res) => {
  wss.clients.forEach(client => {
    client.send('{ "init": "true" }');
  });
  res.set('Content-Type', 'text/turtle');
  res.send("<http://www.ajan.de/ajan-ns#Scene> <http://www.ajan.de/ajan-ns#init> true .");
});

app.post('/pickUp', (req, res) => {
  console.log(req.body);
  let wssMessage = JSON.parse(req.body);
  let action = createAction(wssMessage, "pickUp");
  action.blockX = getActionSubject(wssMessage, "http://www.ajan.de/ajan-ns#Table");
  action.asyncResponse = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \nPREFIX ajan: <http://www.ajan.de/ajan-ns#> \nPREFIX actn: <http://www.ajan.de/actn#> \nPREFIX strips: <http://www.ajan.de/behavior/strips-ns#> \n \n<" + action.blockX + "> strips:is ajan:Holding.";
  action.request = wssMessage;
  let actionRequest = JSON.stringify(action);
  wss.clients.forEach(client => {
    client.send(actionRequest);
  });
  res.set('Content-Type', 'text/turtle');
  res.send(response);
});

app.post('/stack', (req, res) => {
  console.log(req.body);
  let wssMessage = JSON.parse(req.body);
  let action = createAction(wssMessage, "stack");
  action.blockX = getActionSubject(wssMessage, "http://www.ajan.de/ajan-ns#Holding");
  action.blockY = getActionSubject(wssMessage, "http://www.ajan.de/ajan-ns#Clear");
  action.asyncResponse = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \nPREFIX ajan: <http://www.ajan.de/ajan-ns#> \nPREFIX actn: <http://www.ajan.de/actn#> \nPREFIX strips: <http://www.ajan.de/behavior/strips-ns#> \n \najan:Arm strips:is ajan:Empty . <" + action.blockX + "> strips:is ajan:Clear . \n<" + action.blockX + "> ajan:on <" + action.blockY + "> .";
  action.request = wssMessage;
  let actionRequest = JSON.stringify(action);
  wss.clients.forEach(client => {
    client.send(actionRequest);
  });
  res.set('Content-Type', 'text/turtle');
  res.send(response);
});

app.post('/unStack', (req, res) => {
  console.log(req.body);
  let wssMessage = JSON.parse(req.body);
  let action = createAction(wssMessage, "unStack");
  action.blockX = getActionSubject(wssMessage, "http://www.ajan.de/ajan-ns#Clear");
  action.blockY = getActionObject(wssMessage, "http://www.ajan.de/ajan-ns#on");
  action.asyncResponse = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \nPREFIX ajan: <http://www.ajan.de/ajan-ns#> \nPREFIX actn: <http://www.ajan.de/actn#> \nPREFIX strips: <http://www.ajan.de/behavior/strips-ns#> \n \n<" + action.blockX + "> strips:is ajan:Holding . \n<" + action.blockY + "> strips:is ajan:Clear .";
  action.request = wssMessage;
  let actionRequest = JSON.stringify(action);
  wss.clients.forEach(client => {
    client.send(actionRequest);
  });
  res.set('Content-Type', 'text/turtle');
  res.send(response);
});

app.post('/putDown', (req, res) => {
  console.log(req.body);
  let wssMessage = JSON.parse(req.body);
  let action = createAction(wssMessage, "putDown");
  action.blockX = getActionSubject(wssMessage, "http://www.ajan.de/ajan-ns#Holding");
  action.asyncResponse = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \nPREFIX ajan: <http://www.ajan.de/ajan-ns#> \nPREFIX actn: <http://www.ajan.de/actn#> \nPREFIX strips: <http://www.ajan.de/behavior/strips-ns#> \n \najan:Arm strips:is ajan:Empty . \n<" + action.blockX + "> strips:is ajan:Table . \n<" + action.blockX + ">  strips:is ajan:Clear .";
  action.request = wssMessage;
  let actionRequest = JSON.stringify(action);
  wss.clients.forEach(client => {
    client.send(actionRequest);
  });
  res.set('Content-Type', 'text/turtle');
  res.send(response);
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
  });
  return action;
}

function getActionSubject(wssMessage, parameter) {
  let result = null;
  wssMessage.forEach((entry) => {
    if(entry["http://www.ajan.de/behavior/strips-ns#is"] != null) {
        entry["http://www.ajan.de/behavior/strips-ns#is"].forEach((object) => {
            if(object["@id"] == parameter) {
              console.log(entry["@id"]);
              result = entry["@id"];
            }
        });
    }
  });
  return result;
}

function getActionObject(wssMessage, parameter) {
  let result = null;
  wssMessage.forEach((entry) => {
    if(entry[parameter] != null) {
      entry[parameter].forEach((object) => {
          if(object["@id"] != null) {
            console.log(object["@id"]);
            result = object["@id"];
          }
      });
    }
  });
  return result;
}
