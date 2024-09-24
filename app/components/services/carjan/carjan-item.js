import Component from "@ember/component";
import $ from "jquery";

export default Component.extend({
  scale: 1.0,
  translateX: 0,
  translateY: 0,
  drag: {
    state: false,
    x: 0,
    y: 0,
  },

  didInsertElement() {
    this._super(...arguments);
    this.setupCanvas();
    this.setupPanningAndZoom();
  },
  setupCanvas() {
    const canvas = this.element.querySelector("#gridCanvas");
    const ctx = canvas.getContext("2d");
    const gridSize = 12;
    const cellSize = 50;

    // Farbwerte aus den CSS-Variablen holen
    const rootStyles = getComputedStyle(document.documentElement);
    const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim();
    const colorPrimary1 = rootStyles.getPropertyValue('--color-primary-1').trim();
    const colorPrimary2 = rootStyles.getPropertyValue('--color-primary-2').trim();
    const colorPrimary3 = rootStyles.getPropertyValue('--color-primary-3').trim();
    const colorPrimary4 = rootStyles.getPropertyValue('--color-primary-4').trim();
    const colorPrimary5 = rootStyles.getPropertyValue('--color-primary-5').trim();
    const colorPrimary6 = rootStyles.getPropertyValue('--color-primary-6').trim();

    const colors = [colorPrimary, colorPrimary1, colorPrimary2, colorPrimary3, colorPrimary4, colorPrimary5, colorPrimary6];

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          // Verwende abwechselnd Farben aus dem Farbarray für das Schachbrettmuster
          const colorIndex = (i + j) % colors.length;
          const cellColor = colors[colorIndex];

          // Fülle die Zellen mit der entsprechenden Farbe
          ctx.fillStyle = cellColor;
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);

          // Zeichne die Rahmen der Zellen
          ctx.strokeStyle = "#000";
          ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
        }
      }
    };

    drawGrid();
  }
,

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

    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onWheel = this.onWheel.bind(this);

    this.viewport = viewport;
    viewport.addEventListener("mousedown", this._onMouseDown);
    viewport.addEventListener("mouseup", this._onMouseUp);
    viewport.addEventListener("mousemove", this._onMouseMove);
    viewport.addEventListener("wheel", this._onWheel);

    viewport.style.cursor = "grab";
  },

  onMouseDown(e) {
    if (e.button === 0) {
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

    newScale = Math.min(Math.max(newScale, 0.5), 2);

    const scaleChange = newScale / prevScale;

    const mouseX = clientX - viewportRect.left;
    const mouseY = clientY - viewportRect.top;

    const translateX = this.get("translateX");
    const translateY = this.get("translateY");

    const room = this.element.querySelector(".room");
    const roomRect = room.getBoundingClientRect();

    const roomCenterX = translateX + roomRect.width / 2;
    const roomCenterY = translateY + roomRect.height / 2;

    const offsetX = mouseX - roomCenterX;
    const offsetY = mouseY - roomCenterY;

    const newTranslateX = translateX - offsetX * (scaleChange - 1);
    const newTranslateY = translateY - offsetY * (scaleChange - 1);

    this.set("scale", newScale);
    this.set("translateX", newTranslateX);
    this.set("translateY", newTranslateY);

    this.applyTransform();
  },
});
