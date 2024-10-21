import Component from "@ember/component";

export default Component.extend({
  entities: null,

  async init() {
    this._super(...arguments);
    await this.loadEntities();
  },

  async loadEntities() {
    try {
      const response = await fetch("/assets/carjan/entities.json");
      const entities = await response.json();
      this.set("entities", entities);
    } catch (error) {
      console.error("Error loading entities:", error);
    }
  },

  actions: {
    dragStart(event) {
      const entityType = event.currentTarget.dataset.entityType;

      event.dataTransfer.setData("text", entityType);

      const iconMap = {
        pedestrian: "#pedestrian-icon",
        vehicle: "#vehicle-icon",
        autonomous: "#autonomous-icon",
        obstacle: "#obstacle-icon",
      };

      const dragIconSelector = iconMap[entityType] || "#map-icon";
      const dragIcon = this.element.querySelector(dragIconSelector);

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
});
