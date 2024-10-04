import Component from "@ember/component";

export default Component.extend({
  actions: {
    onDragStart(event) {
      const entityType = event.target.id.replace("-icon", "");

      event.dataTransfer.setData("text", entityType);

      const iconMap = {
        pedestrian: "#pedestrian-icon",
        vehicle: "#car-icon",
        autonomous: "#autonomous-icon",
        obstacle: "#obstacle-icon",
        map: "#map-icon",
      };

      const dragIconSelector = iconMap[event.target.id] || "#map-icon";
      const dragIcon = document.querySelector(dragIconSelector);

      if (dragIcon) {
        event.dataTransfer.setDragImage(dragIcon, 10, 10);
      }
    },
  },
});
