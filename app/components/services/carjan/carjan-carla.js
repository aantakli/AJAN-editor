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
  reloadFlag: false,
  startupFlag: false,
  behaviors: null,

  // Beobachter für den Schritt 3-Status
  step3StatusObserver: observer("carjanState.step3Status", function () {
    setTimeout(() => {
      $(".ui.bottom.sidebar").sidebar("show");
      this.createAjanAgents();
    }, 300);
  }),

  didRender() {
    this._super(...arguments);

    next(() => {
      const logContainer = $("#carla-terminal");
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

  setupTabClickListeners() {
    // Alle Tab-Elemente auswählen
    const tabs = document.querySelectorAll(".menu .item");

    if (tabs.length === 0) {
      console.error("Keine Tabs gefunden, um Click-Listener zu binden.");
      return;
    }

    // Click-Event binden
    tabs.forEach((tab) => {
      tab.addEventListener("click", (event) => {
        const tabLabel = tab.textContent.trim();
        console.log("Tab geklickt:", tabLabel);
        this.set("reloadFlag", true);

        const tabName = event.target.getAttribute("data-tab");
        const index = tabName.replace("tab-", "");
        // Update mit tabLabel und Index
        this.updateIframeSrc(tabLabel, index).then(() => {
          setTimeout(() => {
            this.set("reloadFlag", false);
          }, 1000);
        });
      });
    });

    console.log("Click-Listener erfolgreich an Tabs gebunden.");
  },

  async updateIframeSrc(tabLabel, tabIndex) {
    // Finde den Agenten basierend auf dem Tab-Label
    const agent = this.carjanState.agentData.find(
      (entity) => entity.label === tabLabel
    );

    if (!agent) {
      console.error(`No agent found for tab label: ${tabLabel}`);
      return;
    }
    const agentName = agent.label; // Agent-Name aus dem Label
    const repoUri = `http://localhost:8090/rdf4j/repositories/${agentName}`;
    console.log("Agentname:", agentName);
    // Lade die Agenten-Daten und berechne die SRC-URL
    this.downloadAgent(agentName).then(async (agent) => {
      const agentTemplate = this.extractAgentTemplate(agent);
      const agentsRepo = await this.downloadAgentsRepo(agentTemplate);
      // const behavior = this.extractBehaviorUri(agentsRepo, tabLabel);
      const behaviortree = await this.extractBehaviorUri(agentsRepo, tabLabel);
      console.log("behaviortree:", behaviortree);
      const behavior = await this.fetchBehaviorForBT(behaviortree);
      await this.fetchBehaviors();
      console.log("Behavior:", behavior);
      const behaviorUri = this.convertBehaviorURI(behavior, agentName);

      // SRC-URL generieren und iframe aktualisieren
      const src = `http://localhost:4200/editor/behaviors?wssConnection=true&agent=${agentName}&repo=${repoUri}&bt=${behaviorUri}`;
      const iframeId = `carla-iframe-${tabIndex}`;
      const iframe = document.getElementById(iframeId);
      fetchBehaviors;

      if (iframe) {
        iframe.src = src;
        console.log(`Updated iframe src for tab ${tabLabel}: ${src}`);
      } else {
        console.error(`Iframe not found for tab label: ${tabLabel}`);
      }
    });
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
    this.set("startupFlag", true);
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
      this.carjanState.set("step3Status", "loading");
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
    this.set("reloadFlag", true);
    this.carjanState.setUploadScenarioToCarla(true);
  },

  convertBehaviorURI(behaviorURI, agentName) {
    console.log("Behavior URI to be replaced:", behaviorURI);
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

      // Map über alle Entities, um die entsprechenden IFrames zu erstellen
      const promises = entities.map((entity, index) =>
        this.processEntity(entity, index)
      );

      // Warte, bis alle Entities verarbeitet wurden
      await Promise.all(promises);

      this.setupTabs();
      this.setupTabClickListeners();

      this.set("reloadFlag", true);
      await this.updateIframeSrc(entities[0].label, 0);

      this.set("reloadFlag", false);
      this.set("step4Status", "completed");
      this.set("startupFlag", false);
    } catch (error) {
      this.set("step4Status", "error");
      console.error("Failed to create AJAN agents:", error);
    }
  },

  async processEntity(entity, index) {
    const agentName = entity.label;
    const repoUri = `http://localhost:8090/rdf4j/repositories/${agentName}`;
    const behaviorUri = entity.behavior;

    if (!behaviorUri) {
      console.warn(`Agent ${agentName} has no behavior assigned.`);
      return;
    }

    // Konvertiere die Behavior-URI
    const convertedBehaviorUri = this.convertBehaviorURI(
      behaviorUri,
      agentName
    );

    // Generiere die SRC-URL für den Behavior-Editor
    const src = `http://localhost:4200/editor/behaviors?wssConnection=true&agent=${agentName}&repo=${repoUri}&bt=${convertedBehaviorUri}&t=${Date.now()}#split-middle`;

    console.log(`Agent: ${agentName}, SRC: ${src}`);
    console.log("extractBehaviorUri", behaviorUri);

    // Speichere die SRC im agentData-Objekt
    this.carjanState.agentData[index].iFrameSrc = src;

    // Lade das entsprechende iFrame
    const iframeId = `carla-iframe-${index}`;
    const iframe = document.getElementById(iframeId);
    if (iframe) {
      iframe.src = src;
      console.log(`iFrame ${iframeId} src set to ${src}`);
      iframe.onload = () => this.handleIframeLoad(iframe, iframeId);
    } else {
      console.error(`iFrame ${iframeId} not found`);
    }
  },

  handleIframeLoad(iframe, iframeId) {
    console.log(`iFrame ${iframeId} loaded`);
    try {
      setTimeout(() => {
        try {
          const iframeDocument =
            iframe.contentDocument || iframe.contentWindow.document;
          if (!iframeDocument) {
            console.error(`iframeDocument for ${iframeId} not accessible`);
            return;
          }
          // Finde #split-middle und setze es als einzigen Inhalt des Body
          const splitMiddle = iframeDocument.getElementById("split-middle");
          if (splitMiddle) {
            // Entferne alle Inhalte im Body des iFrame
            iframeDocument.body.innerHTML = "";
            // Füge nur #split-middle in den Body ein
            iframeDocument.body.appendChild(splitMiddle);
            // Passe die Größe von #split-middle an
            splitMiddle.style.width = "100%";
            splitMiddle.style.height = "100%";
            console.log(`split-middle rendered for ${iframeId}`);
          } else {
            console.error(`Element 'split-middle' not found in ${iframeId}`);
          }
          // Manuelles Triggern eines resize-Events für die iFrame-Anwendung
          const iframeWindow = iframe.contentWindow;
          if (iframeWindow) {
            console.log("Triggering resize event for iFrame ", iframeId);
            iframeWindow.dispatchEvent(new Event("resize"));
            console.log("Manually triggered resize event for iFrame");
          } else {
            console.error("iframeWindow not accessible for resize event.");
          }
        } catch (e) {
          console.error(`Error accessing content of ${iframeId}:`, e);
        }
      }, 100);
    } catch (e) {
      console.error(`Error accessing content of ${iframeId}:`, e);
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

  async fetchBehaviorForBT(btUri) {
    const sparqlQuery = `
      PREFIX ajan: <http://www.ajan.de/ajan-ns#>
      SELECT ?be
      WHERE {
        ?be ajan:bt <${btUri}> .
      }
    `;
    const repoURL = `http://localhost:8090/rdf4j/repositories/agents`;
    const headers = {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    try {
      const response = await fetch(
        `${repoURL}?query=${encodeURIComponent(sparqlQuery)}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();

      // Extrahiere die BE-URI aus den Ergebnissen
      const beUri =
        data.results.bindings.length > 0
          ? data.results.bindings[0].be.value
          : null;

      if (beUri) {
        console.log(`Matching BE URI for BT ${btUri}: ${beUri}`);
        return beUri;
      } else {
        console.error(`No BE URI found for BT ${btUri}`);
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch BE for BT:", error);
      return null;
    }
  },

  async fetchBehaviors() {
    const sparqlQuery = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX bt: <http://www.ajan.de/behavior/bt-ns#>
      SELECT ?bt ?label
      WHERE {
        ?bt a bt:BehaviorTree .
        ?bt rdfs:label ?label .
      }
    `;
    const repoURL = `http://localhost:8090/rdf4j/repositories/behaviors`;
    const headers = {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    try {
      const response = await fetch(
        `${repoURL}?query=${encodeURIComponent(sparqlQuery)}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      const data = await response.json();
      const behaviors = data.results.bindings.map((binding) => ({
        uri: binding.bt.value,
        label: binding.label.value,
      }));
      this.set("behaviors", behaviors);
    } catch (error) {
      console.error("Failed to fetch behavior trees:", error);
    }
  },

  extractBehaviorUri(agentsRepo, currentTabLabel) {
    // 1. Hole das Entity aus carjanState.agentData basierend auf dem aktuellen Tab-Label
    const currentEntity = this.carjanState.agentData.find(
      (entity) => entity.label === currentTabLabel
    );

    if (!currentEntity) {
      console.error(`Entity with label ${currentTabLabel} not found.`);
      return null;
    }

    // 2. Extrahiere die BT-URI aus dem aktuellen Entity
    const btUri = currentEntity.behavior;

    if (!btUri) {
      console.error(
        `No behavior (BT) found for entity with label ${currentTabLabel}.`
      );
      return null;
    }

    console.log(`Current BT URI for "${currentTabLabel}": ${btUri}`);

    return btUri;
  },

  setupTabs() {
    $(document).ready(function () {
      $(".menu .item").tab();
    });
  },

  setupSidebars() {
    $(document).ready(function () {
      $(".ui.sidebar").sidebar();
    });
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
      console.log("Starting simulation...");
      const behaviors = this.get("behaviors");
      console.log("Behaviors:", behaviors);
      const entities = this.carjanState.agentData;
      console.log("Entities:", entities);
      // filtere die behaviors, die in den Entities enthalten sind
      const filteredBehaviors = behaviors.filter((behavior) =>
        entities.some((entity) => entity.behavior === behavior.uri)
      );

      console.log("Filtered Behaviors:", filteredBehaviors);
      // try {
      //   console.log("Starting simulation...");
      //   await fetch("http://localhost:4204/api/startSimulation", {
      //     method: "POST",
      //     body: JSON.stringify({ behaviors: filteredBehaviors }),
      //   });
      //   console.log("Simulation started.");
      // } catch (error) {
      //   console.error("Failed to start Simulation:", error);
      // }
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
        $(".ui.basic.modal")
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
      $(".ui.modal").modal("hide");
      this.set("isDialogOpen", false);
      $(".ui.top.sidebar").sidebar("hide");
      $(".ui.bottom.sidebar").sidebar("hide");
    },

    openTerminalSidebar() {
      const sidebarElement = $(".ui.top.sidebar.terminal-sidebar").sidebar(
        "toggle"
      );
      console.log("Sidebar Element:", sidebarElement);

      if (sidebarElement.length === 0) {
        console.error("No sidebar element found. Check the selector.");
        return;
      }

      console.log("Toggling Sidebar...");
      sidebarElement.sidebar("toggle");
    },
  },
});
