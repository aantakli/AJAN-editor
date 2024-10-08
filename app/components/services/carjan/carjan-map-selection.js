import Component from "@ember/component";
import { inject as service } from "@ember/service";

export default Component.extend({
  dataBus: service("data-bus"),
  ajax: service(),
  store: service(),
  carjanState: service(),

  init() {
    this._super(...arguments);

    this.set("maps", [{ name: "map01" }, { name: "map02" }, { name: "map03" }]);
  },

  async getMap(mapName) {
    const response = await fetch(`/assets/carjan-maps/${mapName}.json`);
    if (response.ok) {
      const mapData = await response.json();
      return mapData;
    } else {
      console.error("Map not found:", mapName);
      return null;
    }
  },
  actions: {
    async selectMap(mapName) {
      const map = await this.getMap(mapName);
      if (map) {
        this.carjanState.setMapData(map);
        console.log(`Map ${mapName} selected and set.`);
      }
    },
  },
});
