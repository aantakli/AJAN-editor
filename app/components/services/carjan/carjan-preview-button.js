import Component from "@ember/component";

export default Component.extend({
  triggerPreviewEvent() {
    console.log("Previewing in Carjan");

    const event = new CustomEvent("customEditorEvent", {
      detail: { action: "previewInCarjan" },
    });
    document.dispatchEvent(event);
  },

  actions: {
    triggerPreviewEvent() {
      this.triggerPreviewEvent();
    },
  },
});
