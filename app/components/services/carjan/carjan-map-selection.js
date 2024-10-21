import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { set } from "@ember/object";

export default Component.extend({
  carjanState: service(),
  link: "/assets/carjan/carjan-maps/images/",

  init() {
    this._super(...arguments);

    // Define maps with preview images and descriptions
    this.set("maps", [
      {
        name: "map01",
        description: "Urban Area",
        image: this.link + "map01.png",
      },
      {
        name: "map02",
        description: "Suburban Area",
        image: this.link + "map02.png",
      },
      {
        name: "map03",
        description: "Industrial Zone",
        image: this.link + "map03.png",
      },
    ]);
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
