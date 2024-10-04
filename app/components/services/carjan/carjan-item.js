import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { set, observer } from "@ember/object";
import { run } from "@ember/runloop";

export default Component.extend({
  carjanState: service(),
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
  mapData: null,
  agentData: null,

  didInsertElement() {
    this._super(...arguments);
    this.draggingEntityType = null;
    this.setupPanningAndZoom();
    this.applyTransform();
    this.setupGrid(this.carjanState.mapData, this.carjanState.agentData);
  },
  actions: {
    allowDrop(event) {
      event.preventDefault();

      const row = event.target.dataset.row;
      const col = event.target.dataset.col;

      const targetCellStatus = this.gridStatus[`${row},${col}`]
        ? this.gridStatus[`${row},${col}`]
        : {};
      if (
        this.draggingEntityPosition &&
        (row !== this.draggingEntityPosition[0] ||
          col !== this.draggingEntityPosition[1])
      ) {
        this.resetColor();
      }
      if (targetCellStatus.size !== 0) {
        if (targetCellStatus.occupied && this.isDragging) {
          event.target.classList.add("cell-hover-not-allowed");
          event.target.classList.remove("cell-hover-allowed");
          event.target.style.cursor = "not-allowed";
        } else if (this.isDragging) {
          event.target.classList.add("cell-hover-allowed");
          event.target.classList.remove("cell-hover-not-allowed");
          event.target.style.cursor = "grab";
        }
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
      let targetCellStatus;
      if (this.gridStatus) {
        targetCellStatus = this.gridStatus[`${row},${col}`];
      } else {
        targetCellStatus = {};
      }
      if (targetCellStatus.occupied) {
        this.recoverEntity();
        return;
      }

      const entityType = this.draggingEntityType
        ? this.draggingEntityType
        : event.dataTransfer.getData("text");
      this.draggingEntityType = null;

      if (row && col) {
        this.addEntityToGrid(entityType, row, col);
      }
    },

    dropOnBackground(event) {
      event.preventDefault();
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      const row = event.target.dataset.row;
      const col = event.target.dataset.col;
      if (row && col) {
        return;
      }

      this.send("removeBorder", event);

      const closestCell = this.findNearestCell(mouseX, mouseY);

      if (
        closestCell &&
        !this.gridStatus[`${closestCell.row},${closestCell.col}`].occupied
      ) {
        const { row, col } = closestCell;
        const entityType = this.draggingEntityType
          ? this.draggingEntityType
          : event.dataTransfer.getData("text");
        this.draggingEntityType = null;

        this.addEntityToGrid(entityType, row, col);
      } else {
        this.recoverEntity();
      }
    },

    dragLeave(event) {
      event.target.classList.remove("cell-hover-allowed");
      event.target.classList.remove("cell-hover-not-allowed");
      event.target.style.cursor = "move";
    },

    dragStart(event) {
      const row = event.target.dataset.row;
      const col = event.target.dataset.col;

      const cellStatus = this.gridStatus[`${row},${col}`];
      if (cellStatus && cellStatus.occupied) {
        this.draggingEntityType = cellStatus.entityType;
        event.dataTransfer.setData("text", this.draggingEntityType);
        const iconMap = {
          pedestrian: "#pedestrian-icon",
          vehicle: "#car-icon",
          autonomousVehicle: "#map-icon",
        };

        const dragIconSelector =
          iconMap[this.draggingEntityType] || "#map-icon";
        const dragIcon = this.element.querySelector(dragIconSelector);

        event.dataTransfer.setDragImage(dragIcon, 10, 10);

        this.removeEntityFromGrid(row, col);
      } else {
        event.preventDefault();
      }
    },
  },

  mapDataObserver: observer(
    "carjanState.mapData",
    "carjanState.agentData",
    function () {
      const map = this.carjanState.mapData;
      const agents = this.carjanState.agentData;

      if (map && agents) {
        this.setupGrid(map, agents);
      }
    }
  ),

  setupGrid(map = null, agents = null) {
    let cells = [];
    let status = {};

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        let color = "lightgray";

        if (map && map[row] && map[row][col]) {
          const cellType = map[row][col];
          if (cellType === "r") {
            color = "lightgray";
          } else if (cellType === "p") {
            color = "lightgreen";
          }
        }

        status[`${row},${col}`] = {
          occupied: false,
          active: false,
          color: color,
          originalColor: color,
        };

        cells.push({ row, col });
      }
    }
    run.scheduleOnce("afterRender", this, function () {
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const gridElement = this.element.querySelector(
            `.grid-cell[data-row="${row}"][data-col="${col}"]`
          );
          if (gridElement) {
            gridElement.style.backgroundColor = status[`${row},${col}`].color;
          }
        }
      }
    });

    if (agents) {
      agents.forEach((agent) => {
        this.addEntityToGrid(agent.type, agent.y, agent.x);
      });
    }

    set(this, "gridCells", cells);
    set(this, "gridStatus", status);
  },

  refreshGrid(map, agents) {
    set(this, "mapData", map);
    set(this, "agentData", agents);

    this.setupGrid(map, agents);
  },

  recoverEntity() {
    const [originalRow, originalCol] = this.draggingEntityPosition;
    this.addEntityToGrid(this.draggingEntityType, originalRow, originalCol);
    this.draggingEntityType = null;
  },

  addEntityToGrid(entityType, row, col) {
    run.scheduleOnce("afterRender", this, function () {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );
      if (gridElement) {
        let color;
        if (entityType === "pedestrian") {
          color = "blue";
        } else if (entityType === "vehicle") {
          color = "red";
        } else if (entityType === "autonomousVehicle") {
          color = "green";
        } else {
          color = "lightgray";
        }

        gridElement.style.backgroundColor = color;

        gridElement.setAttribute("data-occupied", "true");
        gridElement.setAttribute("data-active", "true");
        gridElement.setAttribute("draggable", "true");
        const originalColor = this.gridStatus[`${row},${col}`].originalColor;
        this.gridStatus[`${row},${col}`] = {
          occupied: true,
          active: true,
          entityType: entityType,
          color: gridElement.style.backgroundColor,
          originalColor: originalColor,
        };
      }
    });
  },

  removeEntityFromGrid(row, col) {
    run.scheduleOnce("afterRender", this, function () {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );
      if (gridElement) {
        const originalColor = this.gridStatus[`${row},${col}`].originalColor;
        gridElement.style.backgroundColor = originalColor;

        gridElement.removeAttribute("data-occupied");
        gridElement.setAttribute("data-active", "false");
        gridElement.removeAttribute("draggable");

        this.gridStatus[`${row},${col}`] = {
          occupied: false,
          active: false,
          color: originalColor,
          originalColor: originalColor,
        };
      }
    });
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

    viewport.style.cursor = "move";
  },

  resetColor() {
    const [row, col] = this.draggingEntityPosition;
    const cellStatus = this.gridStatus[`${row},${col}`];

    run.scheduleOnce("afterRender", this, function () {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );
      if (gridElement) {
        gridElement.style.backgroundColor = cellStatus.originalColor;
      }
    });
  },

  findNearestCell(mouseX, mouseY) {
    let closestCell = null;
    let minDistance = Infinity;

    this.gridCells.forEach((cell) => {
      const row = cell.row;
      const col = cell.col;

      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );

      if (gridElement) {
        const rect = gridElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distance = Math.sqrt(
          Math.pow(centerX - mouseX, 2) + Math.pow(centerY - mouseY, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestCell = { row, col };
        }
      }
    });

    return closestCell;
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
        this.draggingEntityType = this.gridStatus[`${row},${col}`].entityType;
        this.draggingEntityPosition = [row, col];
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
    e.currentTarget.style.cursor = "default";
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
