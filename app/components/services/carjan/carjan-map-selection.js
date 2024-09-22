import Component from "@ember/component";

export default Component.extend({
  maps: null, // Wird die Liste der Karten enthalten

  init() {
    this._super(...arguments);

    // Hier laden wir die Karten dynamisch, z.B. durch einen API-Aufruf.
    // Für den Moment definieren wir sie statisch.
    this.set("maps", [
      { name: "Map 01" },
      { name: "Map 02" },
      { name: "Map 03" },
    ]);
  },

  actions: {
    selectMap(mapName) {
      console.log(`Selected map: ${mapName}`);
      // Hier kannst du weiterverarbeiten, z.B. die ausgewählte Map speichern
    },
  },
});
