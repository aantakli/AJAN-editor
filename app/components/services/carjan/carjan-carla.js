import Component from "@ember/component";
import { next } from "@ember/runloop";

export default Component.extend({
  isDialogOpen: false,
  hasError: false,
  isDisabled: false,
  step1: false,
  step2: false,
  step3: false,
  loadingStep1: false,
  loadingStep2: false,
  loadingStep3: false,

  async startFlask() {
    this.set("loadingStep1", true);
    try {
      const response = await fetch("http://localhost:4204/api/start_flask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result.status);
      this.set("loadingStep1", false);
      this.set("step1", true);
      console.log("Flask started successfully.");
      // this.checkFlaskStatus();
    } catch (error) {
      this.set("loadingStep1", false);
      console.error("Failed to start Flask.", error);
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
    this.set("loadingStep2", true);
    try {
      const response = await fetch("http://localhost:4204/api/start_carla", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result.status);
      this.set("loadingStep2", false);
      this.set("step2", true);
      this.loadScenario();
    } catch (error) {
      this.set("loadingStep2", false);
      console.error("Failed to start Carla.", error);
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
    this.set("loadingStep3", true);
    try {
      const response = await fetch("http://localhost:4204/api/carla-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result);
      this.set("loadingStep3", false);
      this.set("step3", true);
    } catch (error) {
      this.set("loadingStep3", false);
      console.error("Failed to load Scenario.", error);
    }
  },

  actions: {
    async openCarlaModal() {
      this.set("isDialogOpen", true);
      this.set("hasError", false);
      this.set("step1", false);
      this.set("step2", false);
      this.set("step3", false);
      this.set("loadingStep1", false);
      this.set("loadingStep2", false);
      this.set("loadingStep3", false);

      this.startFlask();

      next(() => {
        this.$(".ui.basic.modal")
          .modal({
            closable: false,
            transition: "scale",
            duration: 500,
            dimmerSettings: { duration: { show: 500, hide: 500 } },
          })
          .modal("show");
      });
    },

    closeCarlaDialog() {
      this.stopFlask();
      console.log("Closing dialog...");
      this.$(".ui.modal").modal("hide");
      this.set("isDialogOpen", false);
      this.set("hasError", false);
    },
  },
});
