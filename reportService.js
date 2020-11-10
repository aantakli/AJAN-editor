const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors')
const bodyParser = require('body-parser');

const app = express();
const port = 4202;

//initialize a simple http server
const server = http.createServer(app);

let body = "";
const wss = new WebSocket.Server({ server });

app.use(bodyParser.text({ type: 'text/plain' }));
app.use(bodyParser.text({ type: 'text/turtle' }));
app.use(function (err, req, res, next) {
  console.error(err.stack);
});

app.get('/', cors(), (req, res) => {
  res.send('Hello World!');
});

app.post('/report', (req, res) => {
  body = req.body;
	console.log(body);
  wss.clients.forEach(client => {
    client.send(body);
  });
  res.send('');
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
});

server.listen(port, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});
