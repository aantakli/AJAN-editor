import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { set } from "@ember/object";

export default Component.extend({
  carjanState: service(),
  link: "/assets/carjan/carjan-maps/images/",

  async init() {
    this._super(...arguments);
    await this.loadMaps();
  },

  async loadMaps() {
    try {
      const response = await fetch(
        "/assets/carjan/carjan-maps/map_selection.json"
      );
      const maps = await response.json();
      this.set("maps", maps);
    } catch (error) {
      console.error("Error loading maps:", error);
    }
  },

  async getMap(mapName) {
    const response = await fetch("/assets/carjan/carjan-maps/maps.json");
    const maps = await response.json();

    this.carjanState.setMapName(mapName);

    return maps[mapName] || maps.map01;
  },

  actions: {
    selectMap(mapName) {
      this.setMap(mapName);
      this.set("showMapChangeMessage", true);
      this.set("selectedMap", mapName);
    },
    closeMessage() {
      this.set("showMapChangeMessage", false);
    },
  },

  async setMap(mapName) {
    const map = await this.getMap(mapName);
    this.carjanState.setMapData(map);
  },
});
