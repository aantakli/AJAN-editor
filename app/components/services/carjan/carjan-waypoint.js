import Component from "@ember/component";
import { inject as service } from "@ember/service";

export default Component.extend({
  carjanState: service(), // Waypoints und Paths aus dem State verwalten
  waypoints: null,
  paths: null,

  async init() {
    this._super(...arguments);

    // Lade Waypoints und Paths aus dem carjanState mit Verzögerung
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Trimme das Waypoint-URI nach dem "#" und setze die waypoints und paths
    const trimmedWaypoints = (this.carjanState.waypoints || []).map(
      (waypoint) => ({
        ...waypoint,
        waypointId: waypoint.waypoint.split("#")[1] || waypoint.waypoint, // falls kein '#', bleibt der Wert gleich
      })
    );

    const trimmedPaths = (this.carjanState.paths || []).map((path) => ({
      ...path,
      waypoints: path.waypoints.map((wp) => ({
        ...wp,
        waypointId: wp.waypoint.split("#")[1] || wp.waypoint,
      })),
    }));

    this.set("waypoints", trimmedWaypoints);
    this.set("paths", trimmedPaths);
    console.log("carjanState", this.carjanState);
    console.log("this.carjanstate.waypoints", this.carjanState.waypoints);
    console.log("Trimmed Waypoints: ", this.waypoints);
    console.log("Trimmed Paths: ", this.paths);

    // Rufe die Funktion zur Initialisierung der Tabs auf
    this.setupTabs();
  },
  actions: {
    dragStart(event) {
      const waypointType = event.currentTarget.dataset.waypointType;
      event.dataTransfer.setData("text", waypointType);

      const dragIcon = this.element.querySelector("#map-pin-icon");

      if (dragIcon) {
        dragIcon.style.width = "12px";
        dragIcon.style.height = "12px";
        dragIcon.style.display = "inline-block";

        event.dataTransfer.setDragImage(dragIcon, 24, 24);
      }

      event.stopPropagation();
    },

    dragLeave(event) {
      event.target.classList.remove("cell-hover-allowed");
      event.target.classList.remove("cell-hover-not-allowed");
      event.target.style.cursor = "move";
    },

    addPath() {
      // Logik für neuen Path hinzufügen
      const newPath = {
        name: `Path ${this.paths.length + 1}`,
        description: "New path description",
        waypoints: [],
      };
      this.paths.pushObject(newPath);
      this.carjanState.set("paths", this.paths);
    },
  },

  setupTabs() {
    $(document).ready(function () {
      $(".menu .item").tab();
    });
  },
});
