import Component from "@ember/component";

export default Component.extend({
  maps: null,

  init() {
    this._super(...arguments);

    this.set("maps", [
      { name: "Map 01" },
      { name: "Map 02" },
      { name: "Map 03" },
    ]);
  },

  actions: {
    selectMap(mapName) {
      console.log(`Selected map: ${mapName}`);
    },
  },
});
