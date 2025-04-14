import Component from "@ember/component";

export default Component.extend({
  activeTab: "information", // Standardmäßig auf "information" gesetzt

  actions: {
    switchTab(tabName) {
      this.set("activeTab", tabName);
    },
  },
});
