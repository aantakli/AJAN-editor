import Component from "@ember/component";
import { inject as service } from "@ember/service";

export default Component.extend({
  carjanState: service(), // Waypoints aus dem State verwalten
  waypoints: null,

  async init() {
    this._super(...arguments);
    // Waypoints aus dem carjanState laden (hier könntest du auch aus einem externen Service laden)
    this.set("waypoints", this.carjanState.get("waypoints") || []);
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
  },
  setupTabs() {
    $(document).ready(function () {
      $(".menu .item").tab();
    });
  },
});
