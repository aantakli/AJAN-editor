import Component from "@ember/component";
import { next } from "@ember/runloop";

export default Component.extend({
  isDialogOpen: false,
  hasError: false,
  isDisabled: false,

  async startFlask() {
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
      console.log(result.status); // Ausgabe: "Flask started"
      setTimeout(() => {
        console.log("Starting Carla...");
        // this.startCarla();
      }, 2000);
    } catch (error) {
      console.error("Failed to start Flask.", error);
    }
  },

  async stopFlask() {
    try {
      const response = await fetch("http://localhost:4204/api/shutdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result.status); // Ausgabe: "Flask stopped"
    } catch (error) {
      console.error("Failed to stop Flask.", error);
    }
  },

  async startCarla() {
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
    } catch (error) {
      console.error("Failed to start Carla.", error);
    }
  },

  actions: {
    async openCarlaModal() {
      this.startFlask();
      this.set("isDialogOpen", true);
      this.set("hasError", false);

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
      this.$(".ui.modal").modal("hide");
      this.set("isDialogOpen", false);
      this.set("hasError", false);
    },

    async loadScenario() {
      try {
        const response = await fetch(
          "http://localhost:4204/api/carla-scenario",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log(result);
      } catch (error) {
        console.error("Repository is not available.", error);
      }
    },
    async resetCarla() {
      try {
        const response = await fetch("http://localhost:4204/api/reset-carla", {
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
      } catch (error) {
        console.error("Repository is not available.", error);
      }
    },
    async ajanAgent() {
      try {
        const response = await fetch("http://localhost:4204/api/send_data", {
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
      } catch (error) {
        console.error("Repository is not available.", error);
      }
    },

    async startAgent(entityId) {
      const eID = "Entity0205";
      try {
        const response = await fetch("http://localhost:4204/api/start_agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: eID }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log(result);
      } catch (error) {
        console.error("Repository is not available.", error);
      }
    },
  },
});
