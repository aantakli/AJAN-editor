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
        console.log("Flask ist noch nicht bereit, versuche es erneut...");
      }
    }, 500);
  },

  async loadScenario() {
    this.set("step3Status", "loading");
    this.carjanState.setUploadScenarioToCarla(true);
  },

  actions: {
    async handleStartCarla() {
      await this.stopFlask();
      await this.saveCarlaPath();
      setTimeout(() => {
        this.startFlask();
      }, 1000);
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
      this.$(".ui.modal").modal("hide");
      this.set("isDialogOpen", false);
    },
  },
});
