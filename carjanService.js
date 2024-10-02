const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const {
  initializeCarjanRepository,
  deleteCarjanRepository,
  deleteStatements,
  checkIfRepositoryExists,
} = require("./app/services/carjan/carjan-repository");

const app = express();
const port = 4204;

const server = http.createServer(app);

function startFlaskService() {
  const flaskProcess = spawn(
    "python",
    ["app/services/carjan/server/carla-connection.py"],
    {
      detached: true,
      stdio: "ignore",
    }
  );
  flaskProcess.unref();
  console.log("Flask service started");
}

app.use(cors());

app.post("/api/init-carjan-repo", async (req, res) => {
  try {
    const result = await initializeCarjanRepository();
    res.json({ message: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/delete-statements", async (req, res) => {
  try {
    const result = await deleteStatements();
    res.json({ message: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/delete-carjan-repo", async (req, res) => {
  try {
    const result = await deleteStatements();
    res.json({ message: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/check-repository", async (req, res) => {
  try {
    const result = await checkIfRepositoryExists();
    res.json({ message: result });
    return result;
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.options("/api/carla", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Yes! Carjan Service is running.");
});

app.post("/api/carla", (req, res) => {
  const scenarioData = req.body;

  forwardToFlask(scenarioData)
    .then((response) => {
      res.json({ status: "CARLA scenario processed", flaskResponse: response });
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to process scenario" });
    });
});

// Function to forward data to Flask
function forwardToFlask(scenarioData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: "/api/carla",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    });

    req.on("error", (e) => {
      console.error(`Problem with request: ${e.message}`);
      reject(e);
    });

    req.write(JSON.stringify(scenarioData));
    req.end();
  });
}

// Start Flask and Node.js services
startFlaskService();
server.listen(port, () => {
  console.log(`Carjan Service listening on port ${port} :)`);
});
