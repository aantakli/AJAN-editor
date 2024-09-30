import Component from "@ember/component";
import { inject as service } from "@ember/service";

export default Component.extend({
  ajax: service(),

  actions: {
    async initializeCarjanRepo() {
      try {
        const response = await this.get("ajax").post(
          "http://localhost:4204/api/init-carjan-repo",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Repository initialized successfully:", response);
      } catch (error) {
        console.error("Error initializing CARJAN repository:", error);
      }
    },
  },
});
