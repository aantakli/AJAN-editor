import Component from "@ember/component";

export default Component.extend({
  actions: {
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
  },
});
