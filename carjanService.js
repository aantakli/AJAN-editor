const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const {
  initializeCarjanRepository,
  deleteStatements,
  checkIfRepositoryExists,
} = require("./app/services/carjan/carjan-repository");

const app = express();
const port = 4204;

const server = http.createServer(app);
let flaskProcess = null;
let flaskPid = null;

function startFlaskService() {
  flaskProcess = spawn(
    "python",
    ["app/services/carjan/server/flask_carjan.py"],
    {
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  flaskProcess.stdout.on("data", (data) => {
    console.log(`=== Carjan Service ===\n${data.toString()}`);
  });

  flaskProcess.stderr.on("data", (data) => {
    console.error(`=== Carla Connection ===\n${data.toString()}`);
  });

  flaskProcess.on("close", (code) => {
    console.log(`Flask process exited with code ${code}`);
  });

  flaskProcess.unref();
  flaskPid = flaskProcess.pid;

  flaskProcess.on("exit", (code, signal) => {
    console.log(`Flask process exited with code ${code} and signal ${signal}`);
    flaskProcess = null;
  });
}

async function destroyActors() {
  try {
    const flaskResponse = await forwardToFlask("/destroy_actors");

    console.log("Flask response:", flaskResponse);

    res.json({});
  } catch (error) {
    console.error("Error forwarding to Flask:", error);
    res.status(500).json({ error: "Failed to load scenario" });
  }
}

async function stopFlaskService() {
  if (flaskProcess) {
    try {
      flaskProcess.kill();
      console.log("Flask service stopped.");
      flaskProcess = null;
      flaskPid = null;
      return true;
    } catch (err) {
      console.error("Error stopping Flask process:", err);
      return false;
    }
  } else if (flaskPid) {
    try {
      process.kill(flaskPid);
      console.log(`Flask process with PID ${flaskPid} stopped.`);
      flaskProcess = null;
      flaskPid = null;
      return true;
    } catch (err) {
      console.error(`Error stopping Flask process with PID ${flaskPid}:`, err);
      return false;
    }
  } else {
    console.log("No Flask process to stop.");
    return false;
  }
}

async function waitForFlaskToBeReady() {
  const maxAttempts = 10;
  const delay = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await forwardToFlask("/health_check");
      console.log("Flask response:", response);

      if (response && response.status === "OK") {
        console.log("Flask is ready.");
        return true;
      }
    } catch (error) {
      console.log(`Flask not ready, attempt ${attempt}...`);
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return false;
}

app.use(cors());

app.post("/api/start_flask", async (req, res) => {
  try {
    startFlaskService();
    console.log("Flask process started. Waiting for it to be ready...");

    const flaskReady = await waitForFlaskToBeReady();

    if (flaskReady) {
      console.log("Flask is ready.");
      res.json({
        status: "Flask started",
      });
    } else {
      throw new Error("Flask did not become ready in time.");
    }
  } catch (error) {
    console.error("Error starting Flask:", error);
    res.status(500).json({ error: "Failed to start Flask" });
  }
});

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

app.post("/api/carla-scenario", async (req, res) => {
  try {
    const flaskResponse = await forwardToFlask("/load_scenario");

    console.log("Flask response:", flaskResponse);

    res.json({
      status: "Scenario loaded from Flask",
      scenario: flaskResponse,
    });
  } catch (error) {
    console.error("Error forwarding to Flask:", error);
    res.status(500).json({ error: "Failed to load scenario" });
  }
});

app.post("/api/send_data", async (req, res) => {
  try {
    console.log("Sending data to AJAN agent...");
    const flaskResponse = await forwardToFlask("/send_data");

    console.log("Flask response:", flaskResponse);

    res.json({
      status: "Scenario loaded from Flask",
      scenario: flaskResponse,
    });
  } catch (error) {
    console.error("Error forwarding to Flask:", error);
    res.status(500).json({ error: "Failed to load scenario" });
  }
});

app.post("/api/reset-carla", async (req, res) => {
  try {
    const flaskResponse = await forwardToFlask("/reset_carla");

    console.log("Flask response:", flaskResponse);

    res.json({
      status: "Scenario loaded from Flask",
      scenario: flaskResponse,
    });
  } catch (error) {
    console.error("Error forwarding to Flask:", error);
    res.status(500).json({ error: "Failed to load scenario" });
  }
});

app.get("/shutdown", (req, res) => {
  console.log("Shutting down server...");
  res.send("Shutting down server...");
  stopFlaskService();
  process.exit();
});

app.get("/api/shutdownFlask", async (req, res) => {
  const success = await stopFlaskService();

  if (success) {
    res.status(200).json({ status: "Flask service stopped successfully" });
  } else {
    res.status(500).json({ error: "Failed to stop Flask service" });
  }
});

app.get("/api/health_check", async (req, res) => {
  try {
    const flaskResponse = await forwardToFlask("/health_check");

    if (!flaskResponse.ok) {
      throw new Error(`Flask server returned status ${flaskResponse.status}`);
    }

    const flaskData = await flaskResponse.json();
    console.log("Flask Health-Check response:", flaskData);

    res.json({
      status: "Flask is ready",
      flaskData: flaskData,
    });
  } catch (error) {
    console.error("Error forwarding Health-Check to Flask:", error);
    res.status(500).json({ error: "Flask is not ready" });
  }
});

app.post("/api/start_carla", async (req, res) => {
  try {
    const flaskResponse = await forwardToFlask("/start_carla");

    console.log("Flask response:", flaskResponse);

    res.json({
      status: "Scenario loaded from Flask",
      scenario: flaskResponse,
    });
  } catch (error) {
    console.error("Error forwarding to Flask:", error);
    res.status(500).json({ error: "Failed to load scenario" });
  }
});

app.post("/api/start_agent", async (req, res) => {
  const { id } = req.body;

  try {
    const flaskResponse = await forwardToFlask("/start_agent", id);

    console.log("Flask response:", flaskResponse);

    res.json({
      status: `Startd Agent with ID ${id}`,
      scenario: flaskResponse,
    });
  } catch (error) {
    console.error("Error forwarding to Flask:", error);
    res.status(500).json({ error: "Failed to load scenario" });
  }
});

process.on("SIGINT", () => {
  console.log("Received SIGINT. Shutting down...");
  stopFlaskService().then(() => {
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });
});

function forwardToFlask(endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const method = body ? "POST" : "GET";
    console.log("Forwarding to Flask:", endpoint);
    console.log("method:", method);
    const options = {
      hostname: "localhost",
      port: 5000,
      path: endpoint,
      method: method,
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
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          console.error("Error parsing JSON from Flask:", error);
          console.log("Received response:", data);
          reject("Invalid JSON received from Flask");
        }
      });
    });

    req.on("error", (e) => {
      console.error(`Problem with request: ${e.message}`);
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

server.listen(port, () => {
  console.log(`Carjan Service listening on port ${port} :)`);
});
