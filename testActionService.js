const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors')
const bodyParser = require('body-parser');

const app = express();
const port = 4201;

//initialize a simple http server
const server = http.createServer(app);

let body = "";
const wss = new WebSocket.Server({ server });

app.use(bodyParser.text({ type: 'text/plain' }));
app.use(bodyParser.text({ type: 'text/turtle' }));
app.use(bodyParser.text({ type: 'text/xml' }));
app.use(bodyParser.text({ type: 'application/sparql-results+xml' }));
app.use(function (err, req, res, next) {
  console.error(err.stack);
});

app.get('/', cors(), (req, res) => {
  res.send('Hello World!');
});

app.post('/post', (req, res) => {
  const date = new Date().toUTCString();
  body = date + " [ " + req.body + " ]";
	console.log(body);
  wss.clients.forEach(client => {
    client.send(body);
  });
  res.set('Content-Type', 'text/turtle');
  res.send('<http://localhost:4201/post> <http://localhost:4201/test-service-ns#message>  <http://localhost:4201/test-service-ns#Received> .');
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

function sendConnectMessage(ws) {
  const start = Date.now();
  ws.send('You are now connected to the TestActionService (testActionService.js)!');
  let wait = "This is the last response: .";
  let now = Date.now();
  while ((Date.now() - now) < 1000) { }
  while ((Date.now() - start) < 5000) {
    now = Date.now();
    while ((Date.now() - now) < 500) {}
    wait = wait + ".";
    ws.send(wait);
  }
  ws.send(body);
  console.log("send!");
}
