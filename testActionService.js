const express = require('express');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const rdf = require('rdf-ext');
const n3 = require('rdf-parser-n3');
const stringToStream = require('string-to-stream');
const XMLHttpRequest = require('xmlhttprequest-ssl');

const app = express();
const port = 4201;

//initialize a simple http server
const server = http.createServer(app);

let body = "";
let requestURI = "";
let response = "<http://localhost:4201/post> <http://localhost:4201/test-service-ns#message> <http://localhost:4201/test-service-ns#Received> .";
let asyncResponse = "<http://localhost:4201/post> <http://localhost:4201/test-service-ns#message> <http://localhost:4201/test-service-ns#AsynchronousResponse> .";
const wss = new WebSocket.Server({ server });

app.use(bodyParser.text({ type: 'text/plain', limit: '50mb' }));
app.use(bodyParser.text({ type: 'text/turtle', limit: '50mb' }));
app.use(bodyParser.text({ type: 'text/xml', limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/json', limit: '50mb' }));
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

app.get('/getResponse', (req, res) => {
  res.send(response);
});

app.post('/response', (req, res) => {
  console.log(req.body);
  response = req.body;
  res.send("");
});

app.get('/getAsyncResponse', (req, res) => {
  res.send(asyncResponse);
});

app.post('/asycResponse', (req, res) => {
  console.log(req.body);
  asyncResponse = req.body;
  res.send("");
});

app.post('/post', (req, res) => {
  let wssMessage = {};
  wssMessage.date = new Date().toUTCString();
  wssMessage.headers = getHeaders(req.headers);
  wssMessage.body = req.body;
  console.log(wssMessage);
  wss.clients.forEach(client => {
	  body = wssMessage;
    client.send(JSON.stringify(wssMessage));
  });
  sendResponse(res, req.body);
});

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
	  ws.send(message);
  });

  ws.on("error", (err) => {
    console.log("Caught flash policy server socket error: ");
    console.log(err.stack);
  });

  sendConnectMessage(ws);
});

server.listen(port, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});

function getHeaders(headers) {
  let headersList = new Array();
  for(var propt in headers){
    headersList.push({"key": propt, "value": headers[propt]});
  }
  return headersList;
}

function sendConnectMessage(ws) {
  let wssMessage = {};
  wssMessage.body = "You are now connected to the TestActionService (testActionService.js)!";
  const start = Date.now();
  ws.send(JSON.stringify(wssMessage));
  wssMessage.body = "This is the last response: .";
  let now = Date.now();
  while ((Date.now() - now) < 1000) { }
  while ((Date.now() - start) < 5000) {
    now = Date.now();
    while ((Date.now() - now) < 500) {}
    wssMessage.body = wssMessage.body + ".";
    ws.send(JSON.stringify(wssMessage));
  }
  ws.send(JSON.stringify(body));
  console.log("send!");
}

function sendResponse(res, msg) {
  res.set('Content-Type', 'text/turtle');
  res.send(response);

  requestURI = "";
  const parser = new n3();
  const quadStream = parser.import(stringToStream(msg));
  const graph = Promise.resolve(rdf.dataset().import(quadStream));
  graph.then((value) => {
    value.forEach((quad) => {
      if (quad.predicate.value == "http://www.ajan.de/actn#asyncRequestURI") {
        requestURI = quad.object.value;
        console.log(requestURI);
      }
    });
    if (requestURI != "") {
      setTimeout(function () {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", requestURI, true);
        xhr.setRequestHeader("Content-Type", "text/turtle");
        xhr.send(asyncResponse);
      }, 2000);
    }
  });
}
