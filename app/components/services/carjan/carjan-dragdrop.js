import Component from "@ember/component";

export default Component.extend({
  actions: {
    onDragStart(event) {
      event.dataTransfer.setData("text", event.target.id);
    },
  },
});
