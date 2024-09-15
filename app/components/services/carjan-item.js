import Component from "@ember/component";
import Split from "npm:split.js";

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
    this.setupSplitPanes();
    this.setupCanvas();
    this.setupPanningAndZoom();
    this.setupSaveButton();
    this.setupDropdown();
  },

  setupDropdown() {
    const dropdown = this.element.querySelector(".ui.dropdown");
    if (dropdown) {
      $(dropdown).dropdown();
    }
  },

  setupSplitPanes() {
    // Initialisierung der Split-Panes
    Split(["#split-left", "#split-middle", "#split-right"], {
      sizes: [20, 60, 20], // Passe die Größen nach Bedarf an
      minSize: [200, 300, 200], // Mindestgrößen der Panes
      gutterSize: 5, // Größe des Zwischenraums
      onDragEnd: () => {
        // Aktionen, die nach dem Ändern der Größe durchgeführt werden sollen
        const canvas = this.element.querySelector("#gridCanvas");
        if (canvas) {
          canvas.width = canvas.parentElement.clientWidth;
          canvas.height = canvas.parentElement.clientHeight;
          this.setupCanvas(); // Canvas neu zeichnen
          this.applyTransform(); // Transformation erneut anwenden
        }
      },
    });
  },

  willDestroyElement() {
    this._super(...arguments);
    // Entferne Event Listener, um Speicherlecks zu vermeiden
    this.viewport.removeEventListener("mousedown", this._onMouseDown);
    this.viewport.removeEventListener("mouseup", this._onMouseUp);
    this.viewport.removeEventListener("mousemove", this._onMouseMove);
    this.viewport.removeEventListener("wheel", this._onWheel);
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
    room.style.transform = `translate(${this.get("translateX")}px, ${this.get(
      "translateY"
    )}px) scale(${this.get("scale")})`;
  },

  setupPanningAndZoom() {
    const viewport = this.element.querySelector(".viewport");
    const drag = this.get("drag");

    // Methoden für Event Listener definieren
    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onWheel = this.onWheel.bind(this);

    // Event Listener hinzufügen
    this.viewport = viewport; // Speichere das Element für späteres Entfernen der Listener
    viewport.addEventListener("mousedown", this._onMouseDown);
    viewport.addEventListener("mouseup", this._onMouseUp);
    viewport.addEventListener("mousemove", this._onMouseMove);
    viewport.addEventListener("wheel", this._onWheel);

    // Cursor-Stil anpassen
    viewport.style.cursor = "grab";
  },

  onMouseDown(e) {
    if (e.button === 0) {
      // Linke Maustaste
      const drag = this.get("drag");
      drag.state = true;
      drag.x = e.pageX;
      drag.y = e.pageY;
      e.currentTarget.style.cursor = "grabbing";
    }
  },

  onMouseUp(e) {
    const drag = this.get("drag");
    drag.state = false;
    e.currentTarget.style.cursor = "grab";
  },

  onMouseMove(e) {
    const drag = this.get("drag");
    if (drag.state) {
      const deltaX = e.pageX - drag.x;
      const deltaY = e.pageY - drag.y;

      this.set("translateX", this.get("translateX") + deltaX);
      this.set("translateY", this.get("translateY") + deltaY);

      this.applyTransform();

      drag.x = e.pageX;
      drag.y = e.pageY;
    }
  },

  onWheel(e) {
    e.preventDefault();

    const { clientX, clientY } = e;
    const viewportRect = this.viewport.getBoundingClientRect();

    const prevScale = this.get("scale");
    let newScale = prevScale * (e.deltaY < 0 ? 1.1 : 0.9);

    // Begrenze den Zoom-Faktor (Minimum 0.5, Maximum 2)
    newScale = Math.min(Math.max(newScale, 0.5), 2);

    const scaleChange = newScale / prevScale;

    // Mausposition relativ zum Viewport
    const mouseX = clientX - viewportRect.left;
    const mouseY = clientY - viewportRect.top;

    // Aktuelle Translation
    const translateX = this.get("translateX");
    const translateY = this.get("translateY");

    // Größe des .room-Elements
    const room = this.element.querySelector(".room");
    const roomRect = room.getBoundingClientRect();

    // Mittelpunkt des .room-Elements
    const roomCenterX = translateX + roomRect.width / 2;
    const roomCenterY = translateY + roomRect.height / 2;

    // Abstand zwischen Mauszeiger und Mittelpunkt des .room-Elements
    const offsetX = mouseX - roomCenterX;
    const offsetY = mouseY - roomCenterY;

    // Neue Translation berechnen
    const newTranslateX = translateX - offsetX * (scaleChange - 1);
    const newTranslateY = translateY - offsetY * (scaleChange - 1);

    // Aktualisierung der Werte
    this.set("scale", newScale);
    this.set("translateX", newTranslateX);
    this.set("translateY", newTranslateY);

    this.applyTransform();
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
