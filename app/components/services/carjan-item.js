import Component from "@ember/component";

export default Component.extend({
  scale: 1.0, // Startwert für den Zoom-Faktor
  translateX: 0, // Startwert für das Panning X
  translateY: 0, // Startwert für das Panning Y
  drag: {
    state: false, // Tracking des Panning-Status
    x: 0, // Maus X-Startwert
    y: 0, // Maus Y-Startwert
  },

  didInsertElement() {
    this._super(...arguments);
    this.setupCanvas();
    this.setupPanningAndZoom();
    this.setupSaveButton();
  },

  setupCanvas() {
    const canvas = this.element.querySelector("#gridCanvas");
    const ctx = canvas.getContext("2d");
    const gridSize = 12;
    const cellSize = 50;

    // Zeichne das statische Grid
    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#000";

      for (let i = 0; i <= gridSize; i++) {
        // Vertikale Linien
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();

        // Horizontale Linien
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
      }
    };

    drawGrid(); // Zeichne das Grid einmalig

    // Mittig platzieren
    this.centerGrid();
  },

  // Methode, um das Grid mittig im Container zu platzieren
  centerGrid() {
    const canvas = this.element.querySelector("#gridCanvas");
    const viewport = this.element.querySelector(".viewport");

    const centerX = (viewport.clientWidth - canvas.width) / 2;
    const centerY = (viewport.clientHeight - canvas.height) / 2;

    this.set("translateX", centerX);
    this.set("translateY", centerY);
    this.applyTransform();
  },

  applyTransform() {
    const room = this.element.querySelector(".room");
    room.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  },

  setupPanningAndZoom() {
    const room = this.element.querySelector(".room");
    const drag = this.get("drag");

    // Panning mit linker Maustaste (Mouse 1)
    document.addEventListener("mousedown", (e) => {
      if (e.which === 1) {
        // Linke Maustaste
        drag.state = true;
        drag.x = e.pageX; // Starte das Tracking der Mausposition
        drag.y = e.pageY;
      }
    });

    // Beende das Panning bei mouseup
    document.addEventListener("mouseup", () => {
      drag.state = false;
    });

    // Mausbewegungen verfolgen für Panning
    document.addEventListener("mousemove", (e) => {
      if (drag.state) {
        // Delta-Werte für die Verschiebung
        const deltaX = e.pageX - drag.x;
        const deltaY = e.pageY - drag.y;

        // Aktualisiere die Panning-Werte
        this.set("translateX", this.get("translateX") + deltaX);
        this.set("translateY", this.get("translateY") + deltaY);

        // Wende die Transformation an
        this.applyTransform();

        // Setze die neue Mausposition für die nächste Bewegung
        drag.x = e.pageX;
        drag.y = e.pageY;
      }
    });

    // Zoomen mit dem Scrollrad
    document.addEventListener("wheel", (e) => {
      e.preventDefault();

      const prevScale = this.get("scale");
      let newScale = prevScale;

      // Zoom in oder out je nach Scrollrichtung
      if (e.deltaY < 0) {
        newScale *= 1.1; // Zoom in
      } else {
        newScale *= 0.9; // Zoom out
      }

      // Begrenze den Zoom-Faktor (Minimum 0.5, Maximum 2)
      newScale = Math.min(Math.max(newScale, 0.5), 2); // Maximaler Wert reduziert auf 2
      this.set("scale", newScale);

      // Berechne die Mitte des Containers
      const roomRect = room.getBoundingClientRect();
      const roomCenterX = roomRect.left + roomRect.width / 2;
      const roomCenterY = roomRect.top + roomRect.height / 2;

      // Berechne den Abstand des Mauszeigers vom Zentrum
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const offsetX = mouseX - roomCenterX;
      const offsetY = mouseY - roomCenterY;

      // Skaliere den Offset basierend auf dem neuen Zoom-Faktor
      this.set(
        "translateX",
        this.get("translateX") - offsetX * (newScale - prevScale)
      );
      this.set(
        "translateY",
        this.get("translateY") - offsetY * (newScale - prevScale)
      );

      // Wende die Transformation (Panning + Zoom) an
      this.applyTransform();
    });
  },

  setupSaveButton() {
    const saveButton = this.element.querySelector("#saveButton");
    const loadingIndicator = this.element.querySelector("#loadingIndicator");

    saveButton.addEventListener("click", () => {
      // Zeige Lade-Indikation
      loadingIndicator.style.display = "block";

      // Nach 500ms "Reset" durchführen und die Indikation wieder ausblenden
      setTimeout(() => {
        // Reset Zoom und Panning, und mittig positionieren
        this.set("scale", 1.0);
        this.centerGrid(); // Setze das Grid in die Mitte

        // Verstecke Lade-Indikation
        loadingIndicator.style.display = "none";
      }, 500);
    });
  },
});
