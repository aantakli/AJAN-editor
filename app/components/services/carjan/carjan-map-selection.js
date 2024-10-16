import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { set } from "@ember/object";

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
    const response = await fetch("/assets/carjan/carjan-maps/maps.json");
    const maps = await response.json();
    this.carjanState.setMapName(mapName);
    return maps[mapName] || maps.map01;
  },
  actions: {
    selectMap(mapName) {
      this.setMap(mapName);
    },
  },
  async setMap(mapName) {
    const map = await this.getMap(mapName);
    this.carjanState.setMapData(map);
  },
});
