import Component from "@ember/component";
import { set } from "@ember/object";

export default Component.extend({
  gridSize: 12,
  cellSize: 50,
  gridCells: null,
  scale: 1.0,
  translateX: 0,
  translateY: 0,
  gridStatus: null,
  drag: {
    state: false,
    x: 0,
    y: 0,
  },

  init() {
    this._super(...arguments);
    this.setupGrid();
    this.draggingEntityType = null;
  },

  setupGrid() {
    let cells = [];
    let status = {};
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        cells.push({ row, col });

        status[`${row},${col}`] = { occupied: false, active: false };
      }
    }

    set(this, "gridCells", cells);
    set(this, "gridStatus", status);
  },

  didInsertElement() {
    this._super(...arguments);
    this.setupPanningAndZoom();
    this.applyTransform();
  },

  actions: {
    allowDrop(event) {
      event.preventDefault();

      const row = event.target.dataset.row;
      const col = event.target.dataset.col;

      const targetCellStatus = this.gridStatus[`${row},${col}`];

      if (targetCellStatus.occupied && this.isDragging) {
        event.target.classList.add("cell-hover-not-allowed");
        event.target.classList.remove("cell-hover-allowed");
        event.target.style.cursor = "not-allowed";
      } else if (this.isDragging) {
        event.target.classList.add("cell-hover-allowed");
        event.target.classList.remove("cell-hover-not-allowed");
        event.target.style.cursor = "grab";
      }
    },

    removeBorder(event) {
      event.target.classList.remove("cell-hover-allowed");
      event.target.classList.remove("cell-hover-not-allowed");
      event.target.style.cursor = "grab";
    },

    dropOnCell(event) {
      event.preventDefault();
      this.isDragging = false;
      const row = event.target.dataset.row;
      const col = event.target.dataset.col;

      // Verhindere Überschreiben, wenn bereits eine Entity vorhanden ist
      const targetCellStatus = this.gridStatus[`${row},${col}`];
      if (targetCellStatus.occupied) {
        this.recoverEntity(); // Falls Drop fehlschlägt, stelle die ursprüngliche Entity wieder her
        return;
      }

      // Holen den Entity-Typ entweder vom Dragging oder vom DataTransfer
      const entityType = this.draggingEntityType
        ? this.draggingEntityType
        : event.dataTransfer.getData("text");
      this.draggingEntityType = null;

      // Platziere das neue Entity, wenn kein anderes vorhanden ist
      this.addEntityToGrid(entityType, row, col);
    },

    dragLeave(event) {
      event.target.classList.remove("cell-hover-allowed");
      event.target.classList.remove("cell-hover-not-allowed");
      event.target.style.cursor = "grab";
    },

    dragStart(event) {
      const row = event.target.dataset.row;
      const col = event.target.dataset.col;

      const cellStatus = this.gridStatus[`${row},${col}`];
      if (cellStatus && cellStatus.occupied) {
        this.draggingEntityType = cellStatus.entityType;
        event.dataTransfer.setData("text", this.draggingEntityType);

        this.removeEntityFromGrid(row, col);
      } else {
        event.preventDefault();
      }
    },
  },

  recoverEntity() {
    const [originalRow, originalCol] = this.draggingEntityPosition;
    this.addEntityToGrid(this.draggingEntityType, originalRow, originalCol);

    this.draggingEntityType = null;
  },

  addEntityToGrid(entityType, row, col) {
    const gridElement = this.element.querySelector(
      `.grid-cell[data-row="${row}"][data-col="${col}"]`
    );
    if (gridElement) {
      gridElement.style.backgroundColor =
        entityType === "pedestrian" ? "blue" : "red";

      gridElement.setAttribute("data-occupied", "true");
      gridElement.setAttribute("data-active", "true");
      gridElement.setAttribute("draggable", "true");

      this.gridStatus[`${row},${col}`] = {
        occupied: true,
        active: true,
        entityType: entityType,
      };
    }
  },

  removeEntityFromGrid(row, col) {
    const gridElement = this.element.querySelector(
      `.grid-cell[data-row="${row}"][data-col="${col}"]`
    );
    if (gridElement) {
      gridElement.style.backgroundColor = "lightgray";
      gridElement.removeAttribute("data-occupied");
      gridElement.setAttribute("data-active", "false");
      gridElement.removeAttribute("draggable");

      this.gridStatus[`${row},${col}`] = { occupied: false, active: false };
    }
  },

  applyTransform() {
    const gridContainer = this.element.querySelector("#gridContainer");

    gridContainer.style.transform = `translate3d(${this.get(
      "translateX"
    )}px, ${this.get("translateY")}px, 0) scale(${this.get("scale")})`;
  },

  setupPanningAndZoom() {
    const viewport = this.element.querySelector("#viewport");

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
    const drag = this.get("drag");

    const targetCell = e.target;
    const row = targetCell.dataset.row;
    const col = targetCell.dataset.col;

    const cellStatus = this.gridStatus[`${row},${col}`];
    const isEntityCell = cellStatus && cellStatus.occupied;
    const isCellActive = cellStatus && cellStatus.active;

    if (e.button === 0) {
      if (isEntityCell && isCellActive) {
        // Speichere den Typ und die Position der Entity
        this.draggingEntityType = this.gridStatus[`${row},${col}`].entityType;
        this.draggingEntityPosition = [row, col]; // Speichere die Position

        drag.state = true;
        drag.x = e.pageX;
        drag.y = e.pageY;
        e.currentTarget.style.cursor = "grabbing";
        this.isPanning = false;
        this.isDragging = true;
      } else {
        drag.state = true;
        drag.x = e.pageX;
        drag.y = e.pageY;
        this.isPanning = true;
        this.isDragging = false;
      }
    }
  },
  onMouseUp(e) {
    const drag = this.get("drag");
    drag.state = false;
    e.currentTarget.style.cursor = "grab";
    this.isPanning = false;
    this.isDragging = false;
    this.actions.removeBorder(e);
  },

  onMouseMove(e) {
    const drag = this.get("drag");
    if (drag.state) {
      const deltaX = e.pageX - drag.x;
      const deltaY = e.pageY - drag.y;

      if (this.isPanning) {
        this.set("translateX", this.get("translateX") + deltaX);
        this.set("translateY", this.get("translateY") + deltaY);
        this.applyTransform();
      } else if (this.isDragging) {
      } else {
        this.actions.removeBorder(e);
      }

      drag.x = e.pageX;
      drag.y = e.pageY;
    }
  },
  onWheel(e) {
    e.preventDefault();

    const { clientX, clientY } = e;
    const viewportRect = this.viewport.getBoundingClientRect();

    const prevScale = this.scale;
    let newScale = prevScale * (e.deltaY < 0 ? 1.1 : 0.9);

    newScale = Math.min(Math.max(newScale, 0.5), 2);

    const scaleChange = newScale / prevScale;

    const mouseX = clientX - viewportRect.left;
    const mouseY = clientY - viewportRect.top;

    const translateX = this.translateX;
    const translateY = this.translateY;

    const room = this.element.querySelector("#room");
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
