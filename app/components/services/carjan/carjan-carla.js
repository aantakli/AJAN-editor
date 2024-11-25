import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { next } from "@ember/runloop";
import { observer } from "@ember/object";

export default Component.extend({
  websockets: service(),
  carjanState: service(),
  carlaPath: "",
  errorMessage: "",
  isDialogOpen: false,
  isDisabled: false,
  step1Status: "idle", // "loading", "completed", "error"
  step2Status: "idle",
  step3Status: "idle",
  logs: [],
  autoScrollEnabled: true,
  iFrameSrc: "",

  // Beobachter für den Schritt 3-Status
  step3StatusObserver: observer("carjanState.step3Status", function () {
    setTimeout(() => {
      this.createAjanAgents();
    }, 300);
  }),

  didRender() {
    this._super(...arguments);

    next(() => {
      const logContainer = this.$("#carla-terminal");
      if (logContainer && logContainer.length) {
        logContainer.on("scroll", () => {
          const atBottom =
            logContainer[0].scrollTop + logContainer[0].clientHeight >=
            logContainer[0].scrollHeight - 5;
          this.set("autoScrollEnabled", atBottom);
        });
      }
    });
  },

  didInsertElement() {
    this._super(...arguments);

    // WebSocket initialisieren
    const socket = this.websockets.socketFor("ws://localhost:4204");
    socket.on("message", this.handleLogMessage, this);
  },

  willDestroyElement() {
    const socket = this.websockets.socketFor("ws://localhost:4204");
    socket.off("message", this.handleLogMessage, this);
    window.removeEventListener(
      "beforeunload",
      this.handleBeforeUnload.bind(this)
    );
  },

  handleLogMessage(event) {
    let logMessage = String(event.data);

    if (logMessage.includes("[Error]")) {
      logMessage = `<span class="log-error">${logMessage}</span>`;
    } else if (logMessage.includes("[Warning]")) {
      logMessage = `<span class="log-warning">${logMessage}</span>`;
    } else {
      logMessage = `<span class="log-info">${logMessage}</span>`;
    }

    this.logs.pushObject(logMessage);

    if (this.logs.length > 50) {
      this.logs.shiftObject();
    }
  },

  async handleBeforeUnload(event) {
    try {
      await fetch("http://localhost:4204/api/shutdownFlask", {
        method: "GET",
      });
      console.log("Flask service stopped.");
    } catch (error) {
      console.error("Failed to stop Flask service:", error);
    }

    event.preventDefault();
    event.returnValue = "";
  },

  async saveCarlaPath() {
    try {
      const carlaPath = this.get("carlaPath").replace(/"/g, "");
      const response = await fetch(
        "http://localhost:4204/api/save_environment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: carlaPath }),
        }
      );
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      console.log((await response.json()).status);
    } catch (error) {
      console.error("Failed to save Carla path.", error);
    }
  },

  async startFlask() {
    this.set("step1Status", "loading");
    try {
      const response = await fetch("http://localhost:4204/api/start_flask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      this.set("step1Status", "completed");
      setTimeout(() => this.startCarla(), 1000);
    } catch (error) {
      this.set("step1Status", "error");
      console.error("Failed to start Flask:", error);
    }
  },

  async stopFlask() {
    try {
      const response = await fetch("http://localhost:4204/api/shutdownFlask", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result.status);
    } catch (error) {
      console.error("Failed to stop Flask.", error);
    }
  },

  async startCarla() {
    this.set("step2Status", "loading");
    this.set("errorMessage", "");
    try {
      const response = await fetch("http://localhost:4204/api/start_carla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        this.set("errorMessage", errorData.error || "Failed to start CARLA.");
        throw new Error(errorData.error || "Failed to start CARLA.");
      }
      this.set("step2Status", "completed");
      console.log("Step 2 completed, executing step 3...");
      this.loadScenario();
    } catch (error) {
      this.set("step2Status", "error");
      console.error("Failed to start CARLA:", error);
    }
  },

  async checkFlaskStatus() {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:4204/api/health_check");
        if (response.ok) {
          clearInterval(checkInterval);
          this.startCarla();
        }
      } catch (error) {
        console.log("Flask not ready yet...");
      }
    }, 500);
  },

  loadScenario() {
    this.set("step3Status", "loading");
    this.carjanState.setUploadScenarioToCarla(true);
  },

  convertBehaviorURI(behaviorURI, agentName) {
    return behaviorURI.replace(
      "http://localhost:8090/rdf4j/repositories/agents#",
      `http://localhost:8080/ajan/agents/${agentName}/behaviors/`
    );
  },

  async createAjanAgents() {
    this.set("step4Status", "loading");
    this.set("errorMessage", "");
    try {
      const entities = this.carjanState.agentData;
      console.log("Entities:", entities);

      for (const entity of entities) {
        const agentName = entity.label;
        const repoUri = `http://localhost:8090/rdf4j/repositories/${agentName}`;
        const agent = await this.downloadAgent(agentName);
        const agentTemplate = this.extractAgentTemplate(agent);
        const agentsRepo = await this.downloadAgentsRepo(agentTemplate);
        const behavior = this.extractBehaviorUri(agentsRepo);
        const behaviorUri = this.convertBehaviorURI(behavior, agentName);

        const src = `http://localhost:4200/editor/behaviors?wssConnection=true&agent=${agentName}&repo=${repoUri}&bt=${behaviorUri}`;

        console.log("Creating AJAN agents for", agentName);
        console.log("Repo URI:", repoUri);
        console.log("Behavior URI:", behaviorUri);
        console.log("Agent Template:", agentTemplate);
        console.log("=== src:", src);

        this.set("iFrameSrc", src);
        console.log("this.iFrameSrc:", this.iFrameSrc);
      }
      this.set("step4Status", "completed");
      // Fügen Sie das Stylesheet hinzu, sobald das iFrame geladen ist
      // Fügen Sie das Stylesheet hinzu, sobald das iFrame geladen ist
      next(() => {
        const iframe = document.getElementById("carla-iframe");
        if (iframe) {
          console.log("iFrame found", iframe);
          iframe.onload = () => {
            setTimeout(() => {
              const iframeDocument =
                iframe.contentDocument || iframe.contentWindow.document;
              const style = iframeDocument.createElement("style");
              style.type = "text/css";
              style.innerHTML = `
              .split-left, .split-right {
                display: none !important;
              }
              .split-middle {
                width: 100% !important;
              }
            `;
              iframeDocument.head.appendChild(style);
              console.log("Stylesheet added to iFrame");
            }, 1000); // Verzögerung von 1 Sekunde
          };
        } else {
          console.error("iFrame not found");
        }
      });
    } catch (error) {
      this.set("step4Status", "error");
      console.error("Failed to create AJAN agents:", error);
    }
  },

  async downloadAgent(agentName) {
    const repoURL = `http://localhost:8090/rdf4j/repositories/${agentName}/statements`;
    const headers = {
      Accept: "application/ld+json; charset=utf-8",
    };

    try {
      const response = await fetch(repoURL, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("data:", data);
      return data;
    } catch (error) {
      console.error("Failed to download repository:", error);
    }
  },

  async downloadAgentsRepo() {
    const repoURL = `http://localhost:8090/rdf4j/repositories/agents/statements`;
    const headers = {
      Accept: "application/ld+json; charset=utf-8",
    };

    try {
      const response = await fetch(repoURL, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("data:", data);
      return data;
    } catch (error) {
      console.error("Failed to download repository:", error);
    }
  },

  extractAgentTemplate(data) {
    for (const item of data) {
      if (item["http://www.ajan.de/ajan-ns#agentTemplate"]) {
        const agentTemplate =
          item["http://www.ajan.de/ajan-ns#agentTemplate"][0]["@id"];
        return agentTemplate;
      }
    }
    return null;
  },

  extractBehaviorUri(agentsRepo) {
    for (const item of agentsRepo) {
      if (item["http://www.ajan.de/ajan-ns#behavior"]) {
        const behaviorUri =
          item["http://www.ajan.de/ajan-ns#behavior"][0]["@id"];
        return behaviorUri;
      }
    }
    return null;
  },

  actions: {
    async handleStartCarla() {
      await this.stopFlask();
      await this.saveCarlaPath();
      setTimeout(() => {
        this.startFlask();
      }, 1000);
    },

    async startSimulation() {
      try {
        console.log("Starting simulation...");
        await fetch("http://localhost:4204/api/startSimulation", {
          method: "GET",
        });
        console.log("Simulation started.");
      } catch (error) {
        console.error("Failed to start Simulation:", error);
      }
    },

    async openCarlaModal() {
      this.setProperties({
        isDialogOpen: true,
        step1Status: "idle",
        step2Status: "idle",
        step3Status: "idle",
        logs: [], // Leeren der Logs bei neuer Sitzung
      });
      this.startFlask();
      next(() => {
        this.$(".ui.basic.modal")
          .modal({
            closable: false,
            transition: "scale",
            duration: 500,
          })
          .modal("show");
      });
    },

    closeCarlaDialog() {
      this.stopFlask();
      console.log("Closing dialog...");
      this.set("step1Status", "idle");
      this.set("step2Status", "idle");
      this.carjanState.set("step3Status", "idle");
      this.$(".ui.modal").modal("hide");
      this.set("isDialogOpen", false);
    },
  },
});
