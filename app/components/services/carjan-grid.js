import Component from "@ember/component";

export default Component.extend({
  didInsertElement() {
    this._super(...arguments);
    this.setupCanvas();
  },

  setupCanvas() {
    const canvas = this.element.querySelector("#gridCanvas");
    const ctx = canvas.getContext("2d");
    const gridSize = 12;
    const cellSize = 50;

    let offsetX = 0; // Initialer Verschiebungswert für X-Achse
    let offsetY = 0; // Initialer Verschiebungswert für Y-Achse
    let isDragging = false;
    let startX, startY;

    // Funktion, um das Grid zu zeichnen
    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#000";

      for (let i = 0; i <= gridSize; i++) {
        // Vertikale Linien
        ctx.beginPath();
        ctx.moveTo(i * cellSize + offsetX, 0);
        ctx.lineTo(i * cellSize + offsetX, canvas.height);
        ctx.stroke();

        // Horizontale Linien
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize + offsetY);
        ctx.lineTo(canvas.width, i * cellSize + offsetY);
        ctx.stroke();
      }
    };

    // Maus-Event-Listener für Dragging
    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX - offsetX;
      startY = e.clientY - offsetY;
    });

    canvas.addEventListener("mousemove", (e) => {
      if (isDragging) {
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        drawGrid();
      }
    });

    canvas.addEventListener("mouseup", () => {
      isDragging = false;
    });

    canvas.addEventListener("mouseout", () => {
      isDragging = false;
    });

    // Initiales Zeichnen des Grids
    drawGrid();
  },
});
