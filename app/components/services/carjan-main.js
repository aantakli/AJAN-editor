import Component from "@ember/component";
import Split from "split.js";
import $ from "jquery";

export default Component.extend({
  didInsertElement() {
    this._super(...arguments);
    this.setupSplitPanes();
    this.setupDropdown();
    this.setupTabs();
  },
  setupDropdown() {
    const dropdown = this.element.querySelector(".ui.dropdown");
    if (dropdown) {
      $(dropdown).dropdown();
    }
  },
  setupSaveButton() {
    const saveButton = this.element.querySelector("#saveButton");
    const loadingIndicator = this.element.querySelector("#loadingIndicator");

    saveButton.addEventListener("click", () => {
      loadingIndicator.style.display = "block";

      setTimeout(() => {
        this.set("scale", 1.0);
        this.centerGrid();
        loadingIndicator.style.display = "none";
      }, 500);
    });
  },
  setupSplitPanes() {
    Split(["#split-left", "#split-middle", "#split-right"], {
      sizes: [20, 60, 20],
      minSize: [200, 300, 200],
      direction: "horizontal", // Wichtig für horizontale Ausrichtung
      gutterSize: 5,
      onDragEnd: () => {
        // Aktion nach dem Anpassen der Pane-Größen
        const gridComponent = this.element.querySelector("#split-middle");
        if (gridComponent) {
          const canvasComponent = this.element.querySelector("#gridCanvas");
          if (canvasComponent) {
            canvasComponent.width = canvasComponent.parentElement.clientWidth;
            canvasComponent.height = canvasComponent.parentElement.clientHeight;
          }
        }
      },
    });
  },
  setupTabs() {
    $(document).ready(function () {
      $(".menu .item").tab();
    });
  },
});
