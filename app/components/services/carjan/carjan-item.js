import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { set, observer, computed } from "@ember/object";
import { htmlSafe } from "@ember/string";
import { run } from "@ember/runloop";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdf from "npm:rdf-ext";

export default Component.extend({
  attributeBindings: ["style"],
  rs: getComputedStyle(document.documentElement),
  carjanState: service(),
  gridRows: 12,
  gridCols: 8,
  cellHeight: 50,
  cellWidth: 60,
  gridCells: null,
  scale: 1.0,
  translateX: 0,
  translateY: 0,
  gridStatus: null,
  dragFlag: false,
  mapData: null,
  agentData: null,
  currentWaypoints: [],
  reloadFlag: true,
  draggingEnttiy: null,
  draggingEntityPosition: null,
  previousIcon: null,
  previousChevron: null,
  isDrawing: false,
  startCoords: null,
  headingChevron: 0,
  offsetX: 0,
  offsetY: 0,
  showButtons: false,
  layerButtons: false,
  visibleLayerButtons: false,
  dboxVisibility: true,
  pathVisibility: true,

  style: computed(function () {
    return htmlSafe("height: 100%;");
  }),

  drag: {
    state: false,
    x: 0,
    y: 0,
  },

  colors: {
    road: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim(),
    path: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary-2")
      .trim(),
    void: "#333333",
  },

  headings: [
    "North",
    "North-East",
    "East",
    "South-East",
    "South",
    "South-West",
    "West",
    "North-West",
  ],

  rotationMap: {
    North: 0,
    "North-East": 45,
    East: 90,
    "South-East": 135,
    South: 180,
    "South-West": 225,
    West: 270,
    "North-West": 315,
  },

  offsetMap: {
    North: { x: 17, y: -8 },
    "North-East": { x: 37, y: -2 },
    East: { x: 45, y: 14 },
    "South-East": { x: 37, y: 31 },
    South: { x: 17, y: 38 },
    "South-West": { x: -2, y: 31 },
    West: { x: -10, y: 14 },
    "North-West": { x: -2, y: -2 },
  },

  didInsertElement() {
    this._super(...arguments);
    rdfGraph.set(rdf.dataset());
    this.toggleLayerButtons();

    $("#layer-button").click(function () {
      $(this).toggleClass("basic").toggleClass("black");
    });

    $("#layer-user-button").click(function () {
      $(this).toggleClass("green");
    });

    $("#layer-path-button").click(function () {
      $(this).toggleClass("green");
    });

    $("#layer-waypoint-button").click(function () {
      $(this).toggleClass("green");
    });

    $("#layer-dbox-button").click(function () {
      $(this).toggleClass("green");
    });

    this.draggingEntityType = null;
    this.setupPanningAndZoom();
    this._onCanvasMouseDown = this.onCanvasMouseDown.bind(this);
    this._onCanvasMouseMove = this.onCanvasMouseMove.bind(this);
    this._onCanvasMouseUp = this.onCanvasMouseUp.bind(this);
    this.setupDBDrawing();
    this.applyTransform();
    const fullPath = this.carjanState.selectedPath
      ? this.carjanState.selectedPath.path
      : "main";
    const shortId = fullPath.includes("#") ? fullPath.split("#")[1] : fullPath;
    this.set("gridId", shortId);

    setTimeout(() => {
      this.set("reloadFlag", false);
      if (this.carjanState.mapData && this.carjanState.agentData) {
        this.setupGrid(this.carjanState.mapData, this.carjanState.agentData);
      }
    }, 1000);
  },

  setupDBDrawing() {
    this.onCanvasMouseDown = this.onCanvasMouseDown.bind(this);
    this.onCanvasMouseMove = this.onCanvasMouseMove.bind(this);
    this.onCanvasMouseUp = this.onCanvasMouseUp.bind(this);
  },

  addPath() {
    document.getElementById("overlay").removeAttribute("hidden");

    const markers = document.querySelectorAll("i.icon.map.marker.alternate");
    markers.forEach((marker) => {
      marker.classList.add("highlight-marker");
      marker.style.backgroundColor = "transparent";
      marker.style.boxShadow = "none";
      marker.style.border = "none";
    });
  },

  removeOverlay() {
    document.getElementById("overlay").setAttribute("hidden", true);

    const markers = document.querySelectorAll("i.icon.map.marker.alternate");
    markers.forEach((marker) => {
      marker.classList.remove("highlight-marker");
    });
  },

  toggleLayerButtons() {
    this.set("showButtons", !this.showButtons);
    this.set("layerButtons", !this.layerButtons);
    setTimeout(() => {
      $(".additional-buttons .animated-button").transition({
        animation: "scale",
        interval: 100,
      });
    }, 50);
  },

  actions: {
    toggleEntitiesVisibility() {
      const viewport = document.querySelector("#viewport");
      const entities = viewport.querySelectorAll(
        ".icon.user, .icon.tree, .icon.car, .icon.taxi"
      );

      entities.forEach((entity) => {
        entity.classList.toggle("hidden");
      });
    },

    togglePathVisibility() {
      if (this.pathVisibility) {
        this.carjanState.paths.forEach((path) => {
          this.drawMainPathLines(path);
        });
      } else {
        const pathOverlay = this.element.querySelector(`#${this.gridId}`);
        pathOverlay.innerHTML = "";
        this.resetFlagIcons();
      }
      this.set("pathVisibility", !this.pathVisibility);
    },

    toggleWaypointVisibility() {
      const room = document.querySelector("#room");
      const waypoints = room.querySelectorAll(".icon.map.marker.alternate ");
      const flags = room.querySelectorAll(".icon.flag");

      waypoints.forEach((waypoint) => {
        waypoint.classList.toggle("hidden");
      });
      flags.forEach((flag) => {
        flag.classList.toggle("hidden");
      });
    },

    toggleDboxVisibility() {
      const dboxes = this.carjanState.get("dboxes") || [];
      if (this.dboxVisibility) {
        dboxes.forEach((dbox) => {
          this.markBoundingBoxCorners(
            dbox.startX,
            dbox.endX,
            dbox.startY,
            dbox.endY,
            dbox.color
          );
        });
      } else {
        const canvas = document.getElementById("drawingCanvas");
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      this.set("dboxVisibility", !this.dboxVisibility);
    },

    mouseHoverToggle() {
      this.set("visibleLayerButtons", !this.visibleLayerButtons);
    },

    toggleButtons() {
      this.toggleLayerButtons();
    },

    allowDrop(event) {
      event.preventDefault();

      const row = event.target.dataset.row;
      const col = event.target.dataset.col;

      const targetCellStatus = this.gridStatus[`${row},${col}`]
        ? this.gridStatus[`${row},${col}`]
        : {};

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

      const targetCell = event.target.closest(".grid-cell");
      if (!targetCell) {
        return;
      }
      const row = targetCell.dataset.row;
      const col = targetCell.dataset.col;

      let targetCellStatus = {};
      if (this.gridStatus) {
        targetCellStatus = this.gridStatus[`${row},${col}`];
      }

      if (!targetCellStatus || targetCellStatus.occupied) {
        this.recoverEntity();
        return;
      }

      const entityType = this.draggingEntityType
        ? this.draggingEntityType
        : event.dataTransfer.getData("text");
      if (row && col) {
        if (entityType === "waypoint") {
          this.addSingleWaypoint(row, col, "top-left").then(() => {
            this.isDragging = false;
            this.draggingEntityType = null;
            return;
          });
        } else if (
          (entityType === "vehicle" || entityType === "autonomous") &&
          targetCellStatus.sidewalk
        ) {
          this.recoverEntity();
          return;
        } else {
          if (this.isDragging) {
            this.moveEntityState(row, col);
          }
          this.addEntityToGrid(entityType, row, col);
        }
      }
      this.isDragging = false;
      this.draggingEntityType = null;
    },

    dropOnBackground(event) {
      event.preventDefault();
      const row = event.target.dataset.row;
      const col = event.target.dataset.col;
      // if outside of grid, delete entity
      if (row && col) {
        return;
      }

      this.send("removeBorder", event);

      const closestCell = event.target.closest(".grid-cell");

      if (closestCell) {
        const row = closestCell.dataset.row;
        const col = closestCell.dataset.col;

        if (!this.gridStatus[`${row},${col}`].occupied) {
          const entityType = this.draggingEntityType
            ? this.draggingEntityType
            : event.dataTransfer.getData("text");
          this.draggingEntityType = null;

          this.addEntityToGrid(entityType, row, col);
        } else {
          this.recoverEntity();
        }
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

      this.draggingEntityPosition = { row, col };

      this.dragFlag = true;

      const cellStatus = this.gridStatus[`${row},${col}`];
      if (
        cellStatus &&
        cellStatus.occupied &&
        cellStatus.entityType !== "void"
      ) {
        this.draggingEntityType = cellStatus.entityType;
        event.dataTransfer.setData("text", this.draggingEntityType);

        const iconMap = {
          pedestrian: "#pedestrian-icon",
          vehicle: "#car-icon",
          autonomous: "#autonomous-icon",
          obstacle: "#obstacle-icon",
        };

        const dragIconSelector =
          iconMap[this.draggingEntityType] || "#map-icon";
        const dragIcon = this.element.querySelector(dragIconSelector);

        if (dragIcon) {
          dragIcon.style.width = "20px";
          dragIcon.style.height = "20px";
          dragIcon.style.display = "inline-block";
          event.dataTransfer.setDragImage(dragIcon, 12, 12);
        }

        this.removeEntityFromGrid(row, col);
      } else {
        event.preventDefault();
      }
    },

    saveScenario() {
      this.saveEditorToRepo();
    },
  },

  mapDataObserver: observer(
    "carjanState.mapData",
    "carjanState.agentData",
    async function () {
      const currentMap = this.carjanState.mapData;
      const currentAgents = this.carjanState.agentData;
      if (
        (this.previousMap !== currentMap ||
          this.previousAgents !== currentAgents) &&
        !this.reloadFlag
      ) {
        await this.deleteAllEntites();
        this.setupGrid(currentMap, currentAgents);
        this.previousMap = currentMap;
        this.previousAgents = currentAgents;
      }
    }
  ),

  loadingObserver: observer("carjanState.loading", function () {
    if (this.carjanState.loading) {
      this.set("reloadFlag", true);
    } else {
      this.set("reloadFlag", false);
    }
  }),

  pathModeObserver: observer("carjanState.pathMode", function () {
    if (this.carjanState.pathMode && this.mode === "path") {
      this.setupGrid(this.carjanState.mapData, this.carjanState.agentData);
      const cameraIcon = document.getElementById("cameraIcon");
      if (cameraIcon) {
        cameraIcon.classList.add("hidden");
      }
    } else {
      const cameraIcon = document.getElementById("cameraIcon");
      if (cameraIcon) {
        cameraIcon.classList.remove("hidden");
      }
    }
  }),

  waypointObserver: observer("carjanState.waypoints", function () {
    const newWaypoints = this.carjanState.get("waypoints");
    const previousWaypoints = this.currentWaypoints || [];

    // Find added waypoints
    const addedWaypoints = newWaypoints.filter(
      (newWaypoint) =>
        !previousWaypoints.some(
          (prevWaypoint) =>
            prevWaypoint.waypoint === newWaypoint.waypoint &&
            prevWaypoint.x === newWaypoint.x &&
            prevWaypoint.y === newWaypoint.y &&
            prevWaypoint.positionInCell === newWaypoint.positionInCell
        )
    );

    // Find removed waypoints
    const removedWaypoints = previousWaypoints.filter(
      (prevWaypoint) =>
        !newWaypoints.some(
          (newWaypoint) =>
            newWaypoint.waypoint === prevWaypoint.waypoint &&
            newWaypoint.x === prevWaypoint.x &&
            newWaypoint.y === prevWaypoint.y &&
            newWaypoint.positionInCell === prevWaypoint.positionInCell
        )
    );

    // Update grid for added waypoints
    addedWaypoints.forEach((waypoint) => {
      this.addSingleWaypoint(waypoint.x, waypoint.y, waypoint.positionInCell);
    });

    // Update grid for removed waypoints
    removedWaypoints.forEach((waypoint) => {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${waypoint.x}"][data-col="${waypoint.y}"]`
      );
      if (gridElement) {
        const waypointIcon = gridElement.querySelector(
          `.icon.map.marker.alternate[data-position-in-cell="${waypoint.positionInCell}"]`
        );
        if (waypointIcon) {
          gridElement.removeChild(waypointIcon);
        }
        let cellStatus;
        if (this.gridStatus) {
          cellStatus = this.gridStatus[`${waypoint.x},${waypoint.y}`];
        }
        if (cellStatus) {
          cellStatus.waypoints = cellStatus.waypoints.filter(
            (wp) => wp.positionInCell !== waypoint.positionInCell
          );
        }
      }
    });

    // Update current waypoints
    this.currentWaypoints = newWaypoints;
  }),

  saveObserver: observer("carjanState.isSaveRequest", function () {
    if (this.carjanState.isSaveRequest) {
      this.saveEditorToRepo();
    }
  }),

  cameraPositionObserver: observer("carjanState.cameraPosition", function () {
    this.updateCameraPosition();
  }),

  addPathObserver: observer("carjanState.addPath", function () {
    if (this.carjanState.addPath) {
      this.addPath();
    } else {
      this.removeOverlay();
    }
  }),

  selectedPathObserver: observer("carjanState.selectedPath", function () {
    this.resetFlagIcons();
    const pathOverlay = this.element.querySelector(`#${this.gridId}`);
    if (pathOverlay) {
      pathOverlay.innerHTML = "";
    }
    this.drawMainPathLines();
  }),

  fallbackPathObserver: observer("carjanState.selectedFallback", function () {
    this.resetFlagIcons();
    this.drawMainPathLines(this.carjanState.selectedFallback);
  }),

  selectedPathColorObserver: observer(
    "carjanState.selectedPath.color",
    function () {
      this.resetFlagIcons();
      this.drawMainPathLines();
    }
  ),

  pathInProgressObserver: observer("carjanState.pathInProgress", function () {
    if (this.carjanState.pathInProgress.waypoints.length === 0) {
      this.pathIcons = [];
    }
  }),

  headingObserver: observer("carjanState.chevronDirection", function () {
    const icon = this.previousIcon;
    if (icon) {
      if (this.previousChevron) {
        this.previousChevron.remove();
      }

      const [row, col] = this.carjanState.currentCellPosition;

      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );

      const agent = this.carjanState.agentData.find(
        (agent) => agent.x.toString() === row && agent.y.toString() === col
      );

      const chevronIcon = document.createElement("i");
      chevronIcon.classList.add("icon", "chevron", "up");
      chevronIcon.style.position = "absolute";
      chevronIcon.style.fontSize = "20px";
      chevronIcon.style.color = "grey";
      chevronIcon.style.pointerEvents = "none";

      gridElement.appendChild(chevronIcon);
      this.previousChevron = chevronIcon;
      chevronIcon.style.transform = `rotate(${
        this.rotationMap[agent.heading]
      }deg)`;
      const offset = this.offsetMap[agent.heading];
      chevronIcon.style.left = `${offset.x}px`;
      chevronIcon.style.top = `${offset.y}px`;
    }
  }),

  entityColorObserver: function () {
    setTimeout(() => {
      const icon = this.previousIcon;
      if (icon) {
        const [row, col] = this.carjanState.currentCellPosition;
        const agent = this.carjanState.agentData.find(
          (agent) => agent.x === row && agent.y === col
        );
        if (agent && agent.color === "#000000") {
          icon.style.color = "#000";
          const targetCell = icon.closest(".grid-cell");
          const row = targetCell.dataset.row;
          const col = targetCell.dataset.col;
          const cellStatus = this.gridStatus[`${row},${col}`];

          // Check if there is an entity in the cell and the waypoint is in the middle-center position
          if (
            cellStatus &&
            cellStatus.entityType &&
            icon.getAttribute("data-position-in-cell") === "middle-center"
          ) {
            icon.style.textShadow = "0 0 5px white";
          } else {
            icon.style.textShadow = "none";
          }
        }
        this.previousIcon = icon;
      }
    }, 200);
  }.observes("carjanState.color"),

  canvasModeObserver: observer("carjanState.canvasMode", function () {
    const mode = this.carjanState.canvasMode;

    if (mode === "dbox") {
      this.unbindPanningAndZoom(); // Deaktiviere Panning und Zoom
      const canvas = document.getElementById("drawingCanvas");
      canvas.style.cursor = "crosshair";
      canvas.style.pointerEvents = "auto";
      canvas.addEventListener("mousedown", this._onCanvasMouseDown);
      canvas.addEventListener("mousemove", this._onCanvasMouseMove);
      canvas.addEventListener("mouseup", this._onCanvasMouseUp);
    } else {
      this.setupPanningAndZoom(); // Reaktiviere Panning und Zoom
      const canvas = document.getElementById("drawingCanvas");
      canvas.style.cursor = "default";
      canvas.style.pointerEvents = "none";
      canvas.removeEventListener("mousedown", this._onCanvasMouseDown);
      canvas.removeEventListener("mousemove", this._onCanvasMouseMove);
      canvas.removeEventListener("mouseup", this._onCanvasMouseUp);
    }
  }),

  initializeEventHandlers() {
    this._onMouseDown = this.onCanvasMouseDown.bind(this);
    this._onMouseMove = this.onCanvasMouseMove.bind(this);
    this._onMouseUp = this.onCanvasMouseUp.bind(this);
  },

  onCanvasMouseDown(event) {
    this.isDrawing = true;
    this.origin = { x: event.offsetX, y: event.offsetY };
  },

  onCanvasMouseMove(event) {
    if (!this.isDrawing) return;

    const gridCells = document.querySelectorAll("#gridContainer .grid-cell");
    const containerRect = document
      .getElementById("gridContainer")
      .getBoundingClientRect();

    // Berechne die aktuellen Bounding Box-Koordinaten
    const currentX = Math.min(event.offsetX, this.origin.x);
    const currentY = Math.min(event.offsetY, this.origin.y);
    const endX = Math.max(event.offsetX, this.origin.x);
    const endY = Math.max(event.offsetY, this.origin.y);

    const adjustedStartX = currentX + containerRect.left;
    const adjustedStartY = currentY + containerRect.top;
    const adjustedEndX = endX + containerRect.left;
    const adjustedEndY = endY + containerRect.top;

    // Entferne vorherige Hover-Klassen
    gridCells.forEach((cell) => cell.classList.remove("cell-hover-db"));

    gridCells.forEach((cell) => {
      const rect = cell.getBoundingClientRect();

      // Prüfe, ob die Bounding Box des gezeichneten Rechtecks die Zelle berührt
      const cellTouched = !(
        adjustedEndX < rect.left || // Rechte Kante der Box links von der Zelle
        adjustedStartX > rect.right || // Linke Kante der Box rechts von der Zelle
        adjustedEndY < rect.top || // Untere Kante der Box über der Zelle
        adjustedStartY > rect.bottom
      ); // Obere Kante der Box unter der Zelle

      if (cellTouched) {
        cell.classList.add("cell-hover-db");
      }
    });

    // Zeichne die aktuelle Selection Box
    const canvas = document.getElementById("drawingCanvas");
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "#8B5E57"; // Border-Farbe
    context.lineWidth = 2;

    context.beginPath();
    context.rect(currentX, currentY, endX - currentX, endY - currentY);
    context.stroke();
  },

  onCanvasMouseUp(event) {
    this.isDrawing = false;
    this.carjanState.setCanvasMode("default");

    const pageDimmer = document.getElementById("page-dimmer");
    $("#page-dimmer").transition("fade");
    if (pageDimmer) {
      pageDimmer.classList.toggle("hidden");
      pageDimmer.classList.toggle("active");
    }

    const gridCells = document.querySelectorAll("#gridContainer .grid-cell");
    gridCells.forEach((cell) => {
      cell.classList.remove("cell-hover-db");
    });

    const canvas = document.getElementById("drawingCanvas");
    const context = canvas.getContext("2d");

    // Calculate bounding box
    const startX = Math.min(this.origin.x, event.offsetX);
    const startY = Math.min(this.origin.y, event.offsetY);
    const endX = Math.max(this.origin.x, event.offsetX);
    const endY = Math.max(this.origin.y, event.offsetY);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    const color = this.carjanState.selectedDBox
      ? this.carjanState.selectedDBox.color
      : "#ff0000";

    // Mark affected grid cells
    const markedCells = this.markGridCells(startX, startY, endX, endY, color);

    if (markedCells.length > 0) {
      // Calculate min/max Row/Col for the corners
      const rows = markedCells.map((cell) => parseInt(cell.row, 10));
      const cols = markedCells.map((cell) => parseInt(cell.col, 10));

      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);

      // Initial color (red as an example)
      const baseColor = [255, 0, 0]; // RGB for red
      const fillColor = this.lightenColor(baseColor, 0.5); // Slightly lighter
      const borderColor = this.darkenColor(baseColor, 0.5); // Slightly darker

      // Define Decision Box
      let newDBox = {
        id: `dbox_${minRow}_${minCol}_${maxRow}_${maxCol}`,
        startX: minRow.toString(),
        startY: minCol.toString(),
        endX: maxRow.toString(),
        endY: maxCol.toString(),
        color: this.rgbToHex(baseColor), // Store as hex
        label: `Decision_Box_${minRow}_${minCol}_${maxRow}_${maxCol}`,
      };

      // Add Decision Box to carjanState
      if (this.carjanState.selectedDBox) {
        newDBox = {
          ...newDBox,
          color: this.carjanState.selectedDBox.color,
          label: this.carjanState.selectedDBox.label,
          id: this.carjanState.selectedDBox.id,
        };
        const updatedDBoxes = this.carjanState.dboxes.filter(
          (dbox) => dbox.id !== this.carjanState.selectedDBox.id
        );
        this.carjanState.setDBoxes(updatedDBoxes);
      }

      this.carjanState.addDBox(newDBox);
      this.carjanState.setSelectedDBox(newDBox);
      this.carjanState.set("properties", "dbox");
      this.carjanState.set("latestToolProperty", "dbox");
    }
  },

  markGridCells(startX, startY, endX, endY, color = "#ff0000") {
    const gridCells = document.querySelectorAll("#gridContainer .grid-cell");
    const markedCells = []; // Liste für markierte Zellen

    const containerRect = document
      .getElementById("gridContainer")
      .getBoundingClientRect();

    // Passe die Bounding Box an die Position von gridContainer an
    const adjustedStartX = startX + containerRect.left;
    const adjustedStartY = startY + containerRect.top;
    const adjustedEndX = endX + containerRect.left;
    const adjustedEndY = endY + containerRect.top;

    let nearestToStart = null;
    let nearestToEnd = null;
    let minDistanceToStart = Infinity;
    let minDistanceToEnd = Infinity;

    gridCells.forEach((cell) => {
      const rect = cell.getBoundingClientRect();

      const cellCenterX = rect.left + rect.width / 2;
      const cellCenterY = rect.top + rect.height / 2;

      // Berechne die Distanz zum Startpunkt
      const distanceToStart = Math.sqrt(
        Math.pow(cellCenterX - adjustedStartX, 2) +
          Math.pow(cellCenterY - adjustedStartY, 2)
      );

      if (distanceToStart < minDistanceToStart) {
        minDistanceToStart = distanceToStart;
        nearestToStart = {
          row: cell.getAttribute("data-row"),
          col: cell.getAttribute("data-col"),
        };
      }

      // Berechne die Distanz zum Endpunkt
      const distanceToEnd = Math.sqrt(
        Math.pow(cellCenterX - adjustedEndX, 2) +
          Math.pow(cellCenterY - adjustedEndY, 2)
      );

      if (distanceToEnd < minDistanceToEnd) {
        minDistanceToEnd = distanceToEnd;
        nearestToEnd = {
          row: cell.getAttribute("data-row"),
          col: cell.getAttribute("data-col"),
        };
      }

      // Überprüfen, ob die Zelle innerhalb der Bounding Box liegt
      if (
        cellCenterX >= adjustedStartX &&
        cellCenterX <= adjustedEndX &&
        cellCenterY >= adjustedStartY &&
        cellCenterY <= adjustedEndY
      ) {
        markedCells.push({
          row: parseInt(cell.getAttribute("data-row"), 10),
          col: parseInt(cell.getAttribute("data-col"), 10),
        });
      }
    });

    // Füge die nächstgelegenen Zellen hinzu (falls nicht bereits markiert)
    if (
      nearestToStart &&
      !markedCells.some(
        (cell) =>
          cell.row === nearestToStart.row && cell.col === nearestToStart.col
      )
    ) {
      markedCells.push({
        row: parseInt(nearestToStart.row, 10),
        col: parseInt(nearestToStart.col, 10),
      });
    }
    if (
      nearestToEnd &&
      !markedCells.some(
        (cell) => cell.row === nearestToEnd.row && cell.col === nearestToEnd.col
      )
    ) {
      markedCells.push({
        row: parseInt(nearestToEnd.row, 10),
        col: parseInt(nearestToEnd.col, 10),
      });
    }

    // Berechne die Bounding Box-Koordinaten
    if (markedCells.length > 0) {
      const rows = markedCells.map((cell) => cell.row);
      const cols = markedCells.map((cell) => cell.col);

      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);

      // Zeichne die Bounding Box nur mit markBoundingBoxCorners
      this.markBoundingBoxCorners(minRow, maxRow, minCol, maxCol, color);
    }

    return markedCells;
  },

  markBoundingBoxCorners(startX, endX, startY, endY, color = "#ff0000") {
    const minRow = parseInt(startX, 10);
    const maxRow = parseInt(endX, 10);
    const minCol = parseInt(startY, 10);
    const maxCol = parseInt(endY, 10);

    const gridCells = document.querySelectorAll("#gridContainer .grid-cell");

    if (gridCells.length === 0) {
      console.error(
        "No grid cells found. Check if the grid is rendered and the selector is correct."
      );
      return;
    }

    const canvas = document.getElementById("drawingCanvas");
    const context = canvas.getContext("2d");

    // Canvas clear (optional)
    // context.clearRect(0, 0, canvas.width, canvas.height);

    let topLeft = null;
    let topRight = null;
    let bottomLeft = null;
    let bottomRight = null;
    // Finde die äußersten Zellen in der Bounding Box
    gridCells.forEach((cell) => {
      const row = parseInt(cell.getAttribute("data-row"), 10);
      const col = parseInt(cell.getAttribute("data-col"), 10);
      const rect = cell.getBoundingClientRect();

      // Top-left corner
      if (row === minRow && col === minCol) {
        topLeft = {
          x: rect.left - canvas.getBoundingClientRect().left,
          y: rect.top - canvas.getBoundingClientRect().top,
        };
      }

      // Top-right corner
      if (row === minRow && col === maxCol) {
        topRight = {
          x: rect.right - canvas.getBoundingClientRect().left,
          y: rect.top - canvas.getBoundingClientRect().top,
        };
      }

      // Bottom-left corner
      if (row === maxRow && col === minCol) {
        bottomLeft = {
          x: rect.left - canvas.getBoundingClientRect().left,
          y: rect.bottom - canvas.getBoundingClientRect().top,
        };
      }

      // Bottom-right corner
      if (row === maxRow && col === maxCol) {
        bottomRight = {
          x: rect.right - canvas.getBoundingClientRect().left,
          y: rect.bottom - canvas.getBoundingClientRect().top,
        };
      }
    });

    const corners = [topLeft, topRight, bottomLeft, bottomRight].filter(
      Boolean
    );

    // Zeichne das Rechteck basierend auf den berechneten Ecken
    if (corners.length === 4) {
      const rectX = topLeft.x;
      const rectY = topLeft.y;
      const rectWidth = topRight.x - topLeft.x;
      const rectHeight = bottomLeft.y - topLeft.y;

      const rgb = this.hexToRgb(color);

      const fillColor = this.lightenColor(rgb, 0.5);
      const borderColor = this.darkenColor(rgb, 0.5);

      context.fillStyle = this.rgbToRgba(fillColor, 0.5); // Transparente Füllung
      context.strokeStyle = this.rgbToRgba(borderColor, 1); // Border-Farbe
      context.lineWidth = 2;

      // Vorschau-Element finden
      const previewElement = document.querySelector(".decision-box-preview");

      if (previewElement) {
        // Setze dynamische Farben
        previewElement.style.backgroundColor = this.rgbToRgba(fillColor, 0.8);
        previewElement.style.border = `2px solid ${this.rgbToRgba(
          borderColor,
          1
        )}`;
      }

      context.fillRect(rectX, rectY, rectWidth, rectHeight);
      context.strokeRect(rectX, rectY, rectWidth, rectHeight);
    } else {
      console.error("Could not determine all corners of the bounding box.");
    }
  },

  lightenColor(rgb, factor) {
    return rgb.map((c) => Math.min(255, c + Math.round((255 - c) * factor)));
  },

  darkenColor(rgb, factor) {
    return rgb.map((c) => Math.max(0, c - Math.round(c * factor)));
  },

  rgbToRgba(rgb, alpha) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  },

  rgbToHex(rgb) {
    return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  },

  hexToRgb(hex) {
    return [
      parseInt(hex.substring(1, 3), 16),
      parseInt(hex.substring(3, 5), 16),
      parseInt(hex.substring(5, 7), 16),
    ];
  },

  resetFlagIcons() {
    const flagIcons = document.querySelectorAll(
      ".grid-cell .icon.flag.outline, .grid-cell .icon.map.marker.alternate"
    );

    flagIcons.forEach((icon) => {
      icon.classList.remove("flag", "outline");
      icon.classList.add("map", "marker", "alternate");
      icon.style.color = "black";
      icon.style.transform = "scale(1)";
      icon.style.textShadow = "0 0 0 black";
    });
  },

  drawMainPathLines(fallback = null) {
    let path = fallback || this.carjanState.selectedPath;

    if (path && !this.carjanState.pathMode) {
      this.pathIcons = [];

      path.waypoints.forEach((waypoint) => {
        const waypointElement = document.querySelector(
          `.grid-cell[data-row="${waypoint.x}"][data-col="${waypoint.y}"] .icon[data-position-in-cell="${waypoint.positionInCell}"]`
        );

        if (waypointElement) {
          this.pathIcons.push(waypointElement);
        }
      });
      if (this.pathIcons.length > 1) {
        this.pathIcons[0].style.color = path.color;
        this.pathIcons[0].style.textShadow = "1px 2px 3px black";
        this.pathIcons[0].style.transform = "scale(1.5)";
        this.pathIcons[0].style.zIndex = 1000;

        // hightlight the lastwaypoint and replace it with a flag
        const lastWaypoint = this.pathIcons[this.pathIcons.length - 1];
        lastWaypoint.style.color = path.color;
        // scale it
        lastWaypoint.style.transform = "scale(1.5)";
        // highlight with a harsh black shadow
        lastWaypoint.style.textShadow = "1px 2px 3px black";

        lastWaypoint.style.zIndex = 1000;
        lastWaypoint.classList.remove("map", "marker", "alternate");
        lastWaypoint.classList.add("flag", "outline");
      }

      this.drawPathLines(fallback);
    }
  },

  moveEntityState(x, y) {
    const { row, col } = this.draggingEntityPosition;
    const entity = this.carjanState.agentData.find(
      (agent) => agent.x === row && agent.y === col
    );
    if (entity) {
      entity.x = x;
      entity.y = y;
      entity.entity = `http://example.com/carla-scenario#Entity${String(
        x
      ).padStart(2, "0")}${String(y).padStart(2, "0")}`;
    }
    this.draggingEntityPosition = null;
  },

  deleteAllEntites() {
    if (this.gridCells) {
      this.gridCells.forEach((cell) => {
        const row = cell.row;
        const col = cell.col;
        if (
          this.gridStatus[`${row},${col}`].entityType !== "void" &&
          this.gridStatus[`${row},${col}`].entityType !== null
        ) {
          this.removeEntityFromGrid(row, col);
        }
      });
    }
    let currentMap = this.carjanState.get("mapData");
    this.setVoids(currentMap);
  },

  setVoids(map) {
    if (this.gridCells) {
      this.gridCells.forEach((cell) => {
        const row = cell.row;
        const col = cell.col;
        let color = this.colors.void;

        if (map && map[row] && map[row][col]) {
          const cellType = map[row][col];
          if (cellType === "r" || cellType === "p") {
          }
          if (cellType === "r") {
            color = this.colors.road;
          } else if (cellType === "p") {
            color = this.colors.path;
          }
        }

        if (color === this.colors.void) {
          this.gridStatus[`${row},${col}`] = {
            occupied: true,
            entityType: "void",
          };
        } else {
          this.gridStatus[`${row},${col}`] = {
            occupied: false,
            entityType: null,
          };
        }
      });
    }
  },

  saveEditorToRepo() {
    const rdfGraph = rdf.dataset();

    const gridContainer = this.element.querySelector("#gridContainer");
    if (!gridContainer) {
      return;
    }

    const name = this.carjanState.get("scenarioName");
    const scenarioName = name ? name : "CurrentScenario";
    const scenarioURI = rdf.namedNode(
      `http://example.com/carla-scenario#${scenarioName}`
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        rdf.namedNode("http://example.com/carla-scenario#Scenario")
      )
    );

    const currentMap = this.carjanState.get("mapName");

    if (currentMap) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          rdf.namedNode("http://example.com/carla-scenario#map"),
          rdf.literal(currentMap)
        )
      );
    }

    const showGrid = this.carjanState.get("showGridInCarla") || "false";
    const showPaths = this.carjanState.get("showPathsInCarla") || "false";
    const loadLayers = this.carjanState.get("loadLayersInCarla") || "false";
    const weather = this.carjanState.get("weather") || "Clear";
    const category = this.carjanState.get("category") || "Urban";
    const cameraPosition = this.carjanState.get("cameraPosition") || "up";

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://example.com/carla-scenario#showGrid"),
        rdf.literal(showGrid)
      )
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://example.com/carla-scenario#showPaths"),
        rdf.literal(showPaths)
      )
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://example.com/carla-scenario#loadLayers"),
        rdf.literal(loadLayers)
      )
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://example.com/carla-scenario#weather"),
        rdf.literal(weather)
      )
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://example.com/carla-scenario#category"),
        rdf.literal(category)
      )
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://example.com/carla-scenario#cameraPosition"),
        rdf.literal(cameraPosition)
      )
    );

    const cells = gridContainer.querySelectorAll(".grid-cell");

    cells.forEach((cell) => {
      const row = cell.dataset.row;
      const col = cell.dataset.col;
      const cellStatus = this.gridStatus[`${row},${col}`];

      if (
        cellStatus.occupied &&
        cellStatus.entityType &&
        cellStatus.entityType !== "void"
      ) {
        const entityId =
          String(row).padStart(2, "0") + String(col).padStart(2, "0");
        const entityURI = rdf.namedNode(
          `http://example.com/carla-scenario#Entity${entityId}`
        );

        rdfGraph.add(
          rdf.quad(
            scenarioURI,
            rdf.namedNode("http://example.com/carla-scenario#hasEntity"),
            entityURI
          )
        );

        if (cellStatus.entityType) {
          rdfGraph.add(
            rdf.quad(
              entityURI,
              rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
              rdf.namedNode(
                `http://example.com/carla-scenario#${
                  cellStatus.entityType.charAt(0).toUpperCase() +
                  cellStatus.entityType.slice(1)
                }`
              )
            )
          );
        }

        rdfGraph.add(
          rdf.quad(
            entityURI,
            rdf.namedNode("http://example.com/carla-scenario#x"),
            rdf.literal(
              row,
              rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
            )
          )
        );

        rdfGraph.add(
          rdf.quad(
            entityURI,
            rdf.namedNode("http://example.com/carla-scenario#y"),
            rdf.literal(
              col,
              rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
            )
          )
        );

        if (
          [
            "Pedestrian",
            "pedestrian",
            "Vehicle",
            "vehicle",
            "Autonomous",
            "autonomous",
            "Obstacle",
            "obstacle",
          ].includes(cellStatus.entityType)
        ) {
          const agents = this.carjanState.get("agentData");
          const agent = agents.find(
            (agent) => agent.x === row && agent.y === col
          );

          if (agent && agent.label) {
            rdfGraph.add(
              rdf.quad(
                entityURI,
                rdf.namedNode("http://example.com/carla-scenario#label"),
                rdf.namedNode(
                  `${
                    agent.label.charAt(0).toUpperCase() + agent.label.slice(1)
                  }`
                )
              )
            );
          }

          if (agent && agent.color) {
            rdfGraph.add(
              rdf.quad(
                entityURI,
                rdf.namedNode("http://example.com/carla-scenario#color"),
                rdf.literal(agent.color)
              )
            );
          }

          if (agent && agent.followsPath) {
            rdfGraph.add(
              rdf.quad(
                entityURI,
                rdf.namedNode("http://example.com/carla-scenario#followsPath"),
                rdf.namedNode(`${agent.followsPath}`)
              )
            );
          }

          if (agent && agent.fallbackPath) {
            rdfGraph.add(
              rdf.quad(
                entityURI,
                rdf.namedNode("http://example.com/carla-scenario#fallbackPath"),
                rdf.namedNode(`${agent.fallbackPath}`)
              )
            );
          }

          if (agent && agent.heading) {
            rdfGraph.add(
              rdf.quad(
                entityURI,
                rdf.namedNode("http://example.com/carla-scenario#heading"),
                rdf.literal(agent.heading)
              )
            );
          }

          if (agent && agent.model) {
            rdfGraph.add(
              rdf.quad(
                entityURI,
                rdf.namedNode("http://example.com/carla-scenario#model"),
                rdf.literal(agent.model)
              )
            );
          }

          if (agent && agent.behavior) {
            rdfGraph.add(
              rdf.quad(
                entityURI,
                rdf.namedNode("http://example.com/carla-scenario#behavior"),
                rdf.literal(agent.behavior)
              )
            );
          }

          if (agent && agent.decisionBox) {
            rdfGraph.add(
              rdf.quad(
                entityURI,
                rdf.namedNode("http://example.com/carla-scenario#decisionBox"),
                rdf.namedNode(`${agent.decisionBox}`)
              )
            );
          }
        }
      }
    });

    this.addPathsAndWaypointsFromState(rdfGraph, scenarioURI);
    this.carjanState.setUpdateStatements(rdfGraph);
    this.carjanState.set("isSaveRequest", false);
  },

  async getMap(mapName) {
    const response = await fetch("/assets/carjan/carjan-maps/maps.json");
    const maps = await response.json();
    this.carjanState.setMapName(mapName);
    return maps[mapName] || maps.map01;
  },

  getPositionIndex(positionInCell) {
    const positionMap = {
      "top-left": 0,
      "top-center": 1,
      "top-right": 2,
      "middle-left": 3,
      "middle-center": 4,
      "middle-right": 5,
      "bottom-left": 6,
      "bottom-center": 7,
      "bottom-right": 8,
    };
    return positionMap[positionInCell] ? positionMap[positionInCell] : 0;
  },

  getPositionByIndex(index) {
    const positionMap = {
      0: "top-left",
      1: "top-center",
      2: "top-right",
      3: "middle-left",
      4: "middle-center",
      5: "middle-right",
      6: "bottom-left",
      7: "bottom-center",
      8: "bottom-right",
    };
    return positionMap[index];
  },

  addPathsAndWaypointsFromState(rdfGraph, scenarioURI) {
    const paths = this.carjanState.get("paths") || [];
    const waypoints = this.carjanState.get("waypoints") || [];
    const dboxes = this.carjanState.get("dboxes") || [];

    waypoints.forEach((waypoint) => {
      const positionIndex = this.getPositionIndex(waypoint.positionInCell);

      const waypointId = `Waypoint${String(waypoint.x).padStart(
        2,
        "0"
      )}${String(waypoint.y).padStart(2, "0")}_${positionIndex}`;
      const waypointURI = rdf.namedNode(
        `http://example.com/carla-scenario#${waypointId}`
      );

      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          rdf.namedNode("http://example.com/carla-scenario#hasWaypoints"),
          waypointURI
        )
      );

      rdfGraph.add(
        rdf.quad(
          waypointURI,
          rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          rdf.namedNode("http://example.com/carla-scenario#Waypoint")
        )
      );

      rdfGraph.add(
        rdf.quad(
          waypointURI,
          rdf.namedNode("http://example.com/carla-scenario#x"),
          rdf.literal(
            waypoint.x,
            rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
          )
        )
      );

      rdfGraph.add(
        rdf.quad(
          waypointURI,
          rdf.namedNode("http://example.com/carla-scenario#y"),
          rdf.literal(
            waypoint.y,
            rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
          )
        )
      );

      rdfGraph.add(
        rdf.quad(
          waypointURI,
          rdf.namedNode("http://example.com/carla-scenario#positionInCell"),
          rdf.literal(waypoint.positionInCell || "top-left")
        )
      );
    });

    paths.forEach((path, pathIndex) => {
      const pathId = `Path${pathIndex + 1}`;
      const pathURI = rdf.namedNode(
        `http://example.com/carla-scenario#${pathId}`
      );

      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          rdf.namedNode("http://example.com/carla-scenario#hasPath"),
          pathURI
        )
      );

      rdfGraph.add(
        rdf.quad(
          pathURI,
          rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          rdf.namedNode("http://example.com/carla-scenario#Path")
        )
      );

      rdfGraph.add(
        rdf.quad(
          pathURI,
          rdf.namedNode("http://example.com/carla-scenario#description"),
          rdf.literal(path.description || "")
        )
      );

      rdfGraph.add(
        rdf.quad(
          pathURI,
          rdf.namedNode("http://example.com/carla-scenario#color"),
          rdf.literal(path.color || "")
        )
      );

      if (path.waypoints && path.waypoints.length > 0) {
        let listNode = rdf.blankNode();

        rdfGraph.add(
          rdf.quad(
            pathURI,
            rdf.namedNode("http://example.com/carla-scenario#hasWaypoints"),
            listNode
          )
        );

        path.waypoints.forEach((waypoint, idx) => {
          const positionIndex = this.getPositionIndex(waypoint.positionInCell);
          const waypointId = `Waypoint${String(waypoint.x).padStart(
            2,
            "0"
          )}${String(waypoint.y).padStart(2, "0")}_${positionIndex}`;
          const waypointURI = rdf.namedNode(
            `http://example.com/carla-scenario#${waypointId}`
          );

          rdfGraph.add(
            rdf.quad(
              listNode,
              rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#first"),
              waypointURI
            )
          );

          if (idx < path.waypoints.length - 1) {
            const nextListNode = rdf.blankNode();

            rdfGraph.add(
              rdf.quad(
                listNode,
                rdf.namedNode(
                  "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"
                ),
                nextListNode
              )
            );
            listNode = nextListNode;
          } else {
            rdfGraph.add(
              rdf.quad(
                listNode,
                rdf.namedNode(
                  "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"
                ),
                rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil")
              )
            );
          }
        });
      }
    });

    dboxes.forEach((dbox, dboxIndex) => {
      const dboxURI = rdf.namedNode(
        `http://example.com/carla-scenario#${dbox.id}`
      );

      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          rdf.namedNode("http://example.com/carla-scenario#hasDecisionBoxes"),
          dboxURI
        )
      );

      rdfGraph.add(
        rdf.quad(
          dboxURI,
          rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          rdf.namedNode("http://example.com/carla-scenario#DecisionBox")
        )
      );

      rdfGraph.add(
        rdf.quad(
          dboxURI,
          rdf.namedNode("http://example.com/carla-scenario#id"),
          rdf.literal(dbox.id)
        )
      );

      rdfGraph.add(
        rdf.quad(
          dboxURI,
          rdf.namedNode("http://example.com/carla-scenario#startX"),
          rdf.literal(
            dbox.startX,
            rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
          )
        )
      );

      rdfGraph.add(
        rdf.quad(
          dboxURI,
          rdf.namedNode("http://example.com/carla-scenario#startY"),
          rdf.literal(
            dbox.startY,
            rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
          )
        )
      );

      rdfGraph.add(
        rdf.quad(
          dboxURI,
          rdf.namedNode("http://example.com/carla-scenario#endX"),
          rdf.literal(
            dbox.endX,
            rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
          )
        )
      );

      rdfGraph.add(
        rdf.quad(
          dboxURI,
          rdf.namedNode("http://example.com/carla-scenario#endY"),
          rdf.literal(
            dbox.endY,
            rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
          )
        )
      );

      rdfGraph.add(
        rdf.quad(
          dboxURI,
          rdf.namedNode("http://example.com/carla-scenario#label"),
          rdf.literal(dbox.label)
        )
      );

      rdfGraph.add(
        rdf.quad(
          dboxURI,
          rdf.namedNode("http://example.com/carla-scenario#color"),
          rdf.literal(dbox.color)
        )
      );
    });
  },

  async setupGrid(map = null, agents = null) {
    if (!map || !agents) {
      return;
    }
    let cells = [];
    let status = {};
    let colors = [];

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        let color = this.colors.void;
        let isSidewalk = false;
        if (map && map[row] && map[row][col]) {
          const cellType = map[row][col];
          if (cellType === "r") {
            color = this.colors.road;
          } else if (cellType === "p") {
            color = this.colors.path;
            isSidewalk = true;
          }
        }

        if (color === this.colors.void) {
          status[`${row},${col}`] = {
            occupied: true,
            entityType: "void",
            sidewalk: isSidewalk,
          };
        } else {
          status[`${row},${col}`] = {
            occupied: false,
            entityType: null,
            sidewalk: isSidewalk,
          };
        }

        colors[`${row},${col}`] = color;
        cells.push({ row, col });
      }
    }

    this.gridStatus = status;

    run.scheduleOnce("afterRender", this, function () {
      Ember.run.next(this, () => {
        for (let row = 0; row < this.gridRows; row++) {
          for (let col = 0; col < this.gridCols; col++) {
            const gridElement = this.element.querySelector(
              `.grid-cell[data-row="${row}"][data-col="${col}"]`
            );
            if (gridElement) {
              gridElement.style.backgroundColor = colors[`${row},${col}`];
              gridElement.style.height = `${this.cellHeight}px`;
              gridElement.style.width = `${this.cellWidth}px`;
              const currentStatus = this.gridStatus[`${row},${col}`];
              gridElement.setAttribute("data-occupied", currentStatus.occupied);
              gridElement.setAttribute(
                "data-entityType",
                currentStatus.entityType
              );
              gridElement.setAttribute("data-sidewalk", currentStatus.sidewalk);
            }
          }
        }
      });
    });
    await this.addWaypointsToGrid();
    if (agents && agents.length > 0 && !this.carjanState.pathMode) {
      agents.forEach((agent) => {
        this.addEntityToGrid(agent.type, agent.x, agent.y);
      });
    }
    this.updateCameraPosition();
    set(this, "gridCells", cells);
    set(this, "gridStatus", status);
  },

  updateCameraPosition() {
    const cameraPosition = this.carjanState.get("cameraPosition") || "up";
    const cameraIcon = document.getElementById("cameraIcon");
    const gridContainer = document.getElementById("gridContainer");

    if (cameraIcon) {
      const classesToRemove = [
        "rotated",
        "counterclockwise",
        "clockwise",
        "flipped",
        "horizontally",
      ];
      classesToRemove.forEach((className) => {
        if (cameraIcon.classList.contains(className)) {
          cameraIcon.classList.remove(className);
        }
      });

      const gridWidth = gridContainer.offsetWidth;
      const gridHeight = gridContainer.offsetHeight;

      const margin = -50;

      let top = 0;
      let left = 0;

      switch (cameraPosition) {
        case "up":
          top = gridHeight - cameraIcon.offsetHeight - margin;
          left = gridWidth / 2 - cameraIcon.offsetWidth / 2;
          cameraIcon.classList.add("rotated");
          cameraIcon.classList.add("counterclockwise");
          break;

        case "down":
          top = margin;
          left = gridWidth / 2 - cameraIcon.offsetWidth / 2;
          cameraIcon.classList.add("rotated");
          cameraIcon.classList.add("clockwise");
          break;

        case "left":
          top = gridHeight / 2 - cameraIcon.offsetHeight / 2;
          left = gridWidth - cameraIcon.offsetWidth - margin * 1.5;
          cameraIcon.classList.add("flipped");
          cameraIcon.classList.add("horizontally");
          break;

        case "right":
          top = gridHeight / 2 - cameraIcon.offsetHeight / 2;
          left = margin * 1.5;
          break;
      }

      cameraIcon.style.lineHeight = "36px";
      cameraIcon.style.fontSize = "36px";
      cameraIcon.style.position = "absolute";
      cameraIcon.style.top = `${top}px`;
      cameraIcon.style.left = `${left}px`;
    }
  },

  async addSingleWaypoint(row, col, positionInCell) {
    run.scheduleOnce("afterRender", this, function () {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );
      if (gridElement) {
        let cellStatus = this.gridStatus[`${row},${col}`] || { waypoints: [] };
        if (cellStatus.entityType === "void") {
          cellStatus.entityType = null;
        }
        if (!cellStatus.waypoints) {
          cellStatus.waypoints = [];
        }

        // Check if waypoint already exists at this position
        const existingWaypoint = cellStatus.waypoints.find(
          (waypoint) => waypoint.positionInCell === positionInCell
        );

        if (!existingWaypoint) {
          const waypointIcon = document.createElement("i");
          waypointIcon.classList.add("icon", "map", "marker", "alternate");
          waypointIcon.style.fontSize = "12px";
          waypointIcon.style.position = "absolute";
          waypointIcon.style.pointerEvents = "none";
          waypointIcon.style.zIndex = 1000;

          waypointIcon.setAttribute("data-x", row);
          waypointIcon.setAttribute("data-y", col);
          waypointIcon.setAttribute("data-position-in-cell", positionInCell);

          const cellSize = gridElement.offsetWidth || 36;
          const positionIndex = this.getPositionIndex(positionInCell);
          const [offsetX, offsetY] = this.getOffsetForPositionIndex(
            positionIndex,
            cellSize
          );

          waypointIcon.style.left = `${offsetX}px`;
          waypointIcon.style.top = `${offsetY}px`;

          gridElement.appendChild(waypointIcon);

          cellStatus.waypoints.push({
            type: "waypoint",
            positionInCell: positionInCell,
          });

          this.gridStatus[`${row},${col}`] = cellStatus;
          let prefix = "http://example.com/carla-scenario#";
          let waypointId = `Waypoint${String(row).padStart(2, "0")}${String(
            col
          ).padStart(2, "0")}_${positionIndex}`;

          let waypointURI = `${prefix}${waypointId}`;

          const newWaypoint = {
            waypoint: waypointURI,
            x: row,
            y: col,
            positionInCell: positionInCell,
          };

          const existingWaypoints = this.carjanState.get("waypoints");
          const isDuplicate = existingWaypoints.some(
            (waypoint) =>
              waypoint.waypoint === newWaypoint.waypoint &&
              waypoint.x === newWaypoint.x &&
              waypoint.y === newWaypoint.y &&
              waypoint.positionInCell === newWaypoint.positionInCell
          );

          if (!isDuplicate) {
            this.carjanState.set("waypoints", [
              ...existingWaypoints,
              newWaypoint,
            ]);
          }

          this.currentWaypoints = this.carjanState.get("waypoints");
        }
      }
    });
  },

  async addWaypointsToGrid() {
    await this.removeAllWaypoints();
    const waypoints = this.carjanState.get("waypoints") || [];
    waypoints.forEach((waypoint) => {
      this.addSingleWaypoint(waypoint.x, waypoint.y, waypoint.positionInCell);
    });
  },

  async removeAllWaypoints() {
    if (this.gridStatus) {
      for (let row = 0; row < this.gridRows; row++) {
        for (let col = 0; col < this.gridCols; col++) {
          let cellStatus = this.gridStatus[`${row},${col}`];
          if (cellStatus && cellStatus.waypoints) {
            cellStatus.waypoints = [];
            this.gridStatus[`${row},${col}`] = cellStatus;
          }
        }
      }
    }
  },

  getOffsetForPositionIndex(positionIndex) {
    const cellWidth = this.cellWidth - 15;
    const cellHeight = this.cellHeight - 15;
    const offsets = [
      [0, 0],
      [cellWidth / 2, 0],
      [cellWidth - 2, 0],
      [0, cellHeight / 2 - 2],
      [cellWidth / 2, cellHeight / 2 - 2],
      [cellWidth - 2, cellHeight / 2 - 2],
      [0, cellHeight - 5],
      [cellWidth / 2, cellHeight - 5],
      [cellWidth - 2, cellHeight - 5],
    ];
    return offsets[positionIndex] || [0, 0];
  },

  addEntityToGrid(entityType, row, col) {
    run.scheduleOnce("afterRender", this, function () {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );

      if (gridElement) {
        const cellStatus = this.gridStatus[`${row},${col}`];

        if (cellStatus.occupied && cellStatus.entityType === "void") {
          console.error(`Cannot place entity on void cell at (${row}, ${col})`);
          return;
        }

        const iconMap = {
          Pedestrian: "user",
          pedestrian: "user",
          Vehicle: "car",
          vehicle: "car",
          Autonomous: "taxi",
          autonomous: "taxi",
          Obstacle: "tree",
          obstacle: "tree",
          default: "question",
        };

        const iconClass = iconMap[entityType] || iconMap.default;

        // Create the new icon element
        const iconElement = document.createElement("i");
        iconElement.classList.add("icon", iconClass);
        iconElement.style.fontSize = "24px";
        iconElement.style.display = "flex";
        iconElement.style.alignItems = "center";
        iconElement.style.justifyContent = "center";
        iconElement.style.height = "100%";
        iconElement.style.width = "100%";
        iconElement.style.pointerEvents = "none";
        iconElement.style.zIndex = 999;

        // Append the new icon element without clearing existing content
        gridElement.appendChild(iconElement);

        gridElement.setAttribute("data-occupied", "true");
        gridElement.setAttribute("data-entityType", entityType);
        gridElement.setAttribute("draggable", "true");

        if (cellStatus.waypoints) {
          const middleCenterWaypoint = cellStatus.waypoints.find(
            (waypoint) => waypoint.positionInCell === "middle-center"
          );

          if (middleCenterWaypoint) {
            // Set entity opacity to 75%
            iconElement.style.opacity = "0.5";

            // Highlight the waypoint with a white shadow
            const waypointIcon = gridElement.querySelector(
              `.icon.map.marker.alternate[data-position-in-cell="middle-center"]`
            );
            if (waypointIcon) {
              waypointIcon.style.textShadow = "0 0 5px white";
            }
          }
        }

        this.gridStatus[`${row},${col}`] = {
          occupied: true,
          entityType: entityType,
          waypoints: cellStatus.waypoints || [],
        };
      }
    });
  },

  addEntityToState(entityType, row, col) {
    let prefix = "http://example.com/carla-scenario#";
    let entityId = `Entity${String(row).padStart(2, "0")}${String(col).padStart(
      2,
      "0"
    )}`;
    let entityURI = `${prefix}${entityId}`;

    const newAgent = {
      entity: entityURI,
      x: row,
      y: col,
      type: entityType,
    };

    const existingAgents = this.carjanState.get("agentData");
    const isDuplicate = existingAgents.some(
      (agent) =>
        agent.agent === newAgent.agent &&
        agent.x === newAgent.x &&
        agent.y === newAgent.y &&
        agent.type === newAgent.type
    );

    this.previousAgents = [...existingAgents, newAgent];

    if (!isDuplicate) {
      this.carjanState.set("agentData", [...existingAgents, newAgent]);
    }
  },

  removeEntityFromGrid(row, col) {
    run.scheduleOnce("afterRender", this, function () {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );

      if (gridElement) {
        // Remove only the entity icon, keep the waypoints
        const entityIcon = gridElement.querySelector(
          ".icon:not(.map.marker.alternate)"
        );
        if (entityIcon) {
          entityIcon.remove();
        }

        gridElement.setAttribute("data-occupied", "false");
        gridElement.setAttribute("data-entityType", "null");
        gridElement.removeAttribute("draggable");

        // Preserve waypoints in the cell status
        const cellStatus = this.gridStatus[`${row},${col}`];
        this.gridStatus[`${row},${col}`] = {
          occupied: false,
          entityType: null,
          waypoints: cellStatus.waypoints || [],
        };
      }
    });
  },

  refreshGrid(map, agents) {
    set(this, "mapData", map);
    set(this, "agentData", agents);
    this.setupGrid(map, agents);
  },

  recoverEntity() {
    if (this.draggingEntityPosition) {
      const originalRow = this.draggingEntityPosition.row;
      const originalCol = this.draggingEntityPosition.col;
      this.addEntityToGrid(this.draggingEntityType, originalRow, originalCol);
      this.draggingEntityType = null;
    }
  },

  handlePathMode(e, filteredWaypoints) {
    const pathColor = this.carjanState.selectedPath.color || "#000";

    e.target.style.transition =
      "transform 0.5s ease, color 0.2s ease, textshadow 0.2 ease";
    e.target.style.color = htmlSafe(pathColor);
    e.target.style.transform = "scale(1.8)";

    // Apply white shadow if the waypoint is in the middle-center position
    if (e.target.getAttribute("data-position-in-cell") === "middle-center") {
      e.target.style.textShadow = "0 0 5px white";
    } else {
      e.target.style.textShadow = "0 0 3px black";
    }

    this.pathIcons = this.pathIcons || [];
    this.pathIcons.push(e.target);
  },

  applyTransform() {
    const gridContainer = this.element.querySelector("#gridContainer");
    const pathOverlay = this.element.querySelector(`#${this.gridId}`);
    const scale = this.get("scale");
    const translateX = this.get("translateX");
    const translateY = this.get("translateY");

    gridContainer.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;

    if (pathOverlay) {
    }
  },

  applyTransformToCameraIcon(iconElement) {
    const gridContainer = this.element.querySelector("#gridContainer");
    const scale = this.get("scale");
    const translateX = this.get("translateX");
    const translateY = this.get("translateY");

    iconElement.style.transform += ` translate(${translateX}px, ${translateY}px) scale(${scale})`;
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

  unbindPanningAndZoom() {
    const viewport = this.viewport;

    viewport.removeEventListener("mousedown", this._onMouseDown);
    viewport.removeEventListener("mouseup", this._onMouseUp);
    viewport.removeEventListener("mousemove", this._onMouseMove);
    viewport.removeEventListener("wheel", this._onWheel);

    viewport.style.cursor = "default"; // Optional: Setze den Cursor zurück
  },

  drawPathLines(fallback = null) {
    let path = fallback || this.carjanState.selectedPath;
    const pathOverlay = document.getElementById(this.gridId);
    if (!pathOverlay) return;

    const overlayRect = pathOverlay.getBoundingClientRect();
    const icons = this.pathIcons || [];
    let hiddenFlag = false;
    icons.forEach((icon) => {
      if (icon.classList.contains("hidden")) {
        icon.classList.remove("hidden");
        hiddenFlag = true;
      }
    });
    if (icons.length == 0) {
      const pathElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      pathElement.setAttribute("d", "");
      pathOverlay.appendChild(pathElement);
      return;
    }
    if (icons.length < 2) return;
    if (!path) {
      return;
    }
    const pathColor = path.color || "#000";
    const points = icons.map((icon) => {
      const rect = icon.getBoundingClientRect();

      const centerX =
        (rect.left + rect.width / 2 - overlayRect.left) *
        (1 / this.get("scale"));
      const centerY =
        (rect.top + rect.height / 2 - overlayRect.top) *
        (1 / this.get("scale"));

      return { centerX, centerY };
    });

    let pathData = `M ${points[0].centerX},${points[0].centerY} `;
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];

      const cp1X = start.centerX + (end.centerX - start.centerX) / 3;
      const cp1Y = start.centerY;
      const cp2X = end.centerX - (end.centerX - start.centerX) / 3;
      const cp2Y = end.centerY;

      pathData += `C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${end.centerX},${end.centerY} `;
    }

    const pathElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    pathElement.setAttribute("d", pathData);
    pathElement.setAttribute("stroke", pathColor);
    pathElement.setAttribute("stroke-width", "4");
    pathElement.setAttribute("stroke-dasharray", "8, 8");
    pathElement.setAttribute("fill", "none");
    pathElement.setAttribute("pointer-events", "none");
    pathElement.setAttribute("id", `${this.gridId}-pathline`);

    pathOverlay.appendChild(pathElement);
    if (hiddenFlag) {
      icons.forEach((icon) => {
        icon.classList.add("hidden");
      });
      hiddenFlag = false;
    }
  },

  onMouseDown(e) {
    const drag = this.get("drag");

    if (
      e.target.classList.contains("icon") &&
      e.target.classList.contains("map") &&
      e.target.classList.contains("marker") &&
      e.target.classList.contains("alternate")
    ) {
      const targetCell = e.target.closest(".grid-cell");
      if (!targetCell) return;
      const row = targetCell.dataset.row;
      const col = targetCell.dataset.col;
      const cellStatus = this.gridStatus[`${row},${col}`];
      const positionInCell = e.target.getAttribute("data-position-in-cell");
      const x = e.target.getAttribute("data-x").toString();
      const y = e.target.getAttribute("data-y").toString();
      const waypoints = this.carjanState.waypoints || [];
      const filteredWaypoints = waypoints.filter(
        (waypoint) =>
          waypoint.positionInCell === positionInCell &&
          waypoint.x === x &&
          waypoint.y === y
      );

      if (this.carjanState.pathMode) {
        if (filteredWaypoints.length > 0) {
          this.carjanState.addWaypointToPathInProgress(filteredWaypoints[0]);
        }
        this.handlePathMode(e, filteredWaypoints);
      } else {
        this.carjanState.set("currentCellStatus", cellStatus);
        this.carjanState.set("currentCellPosition", [row, col]);
        this.carjanState.set("properties", "waypoint");
      }
      this.drawPathLines();
      if (this.previousIcon) {
        this.previousIcon.style.color = "#000";
        this.previousIcon.style.textShadow = "none";
      }
      return;
    }

    const targetCell = e.target;
    const row = targetCell.dataset.row;
    const col = targetCell.dataset.col;
    const cellStatus = this.gridStatus[`${row},${col}`];

    if (cellStatus) {
      this.carjanState.set("currentCellStatus", cellStatus);
      this.carjanState.set("currentCellPosition", [row, col]);

      if (this.previousIcon) {
        this.previousIcon.style.color = "#000";
        this.previousIcon.style.textShadow = "none";
      }

      const agents = this.carjanState.get("agentData");
      const agent = agents.find(
        (agent) => agent.x.toString() === row && agent.y.toString() === col
      );

      const agentIcon = targetCell.querySelector(
        ".icon:not(.map.marker.alternate)"
      );

      if (agentIcon) {
        if (agent && agent.followsPath && agent.followsPath !== "null") {
          agentIcon.style.color = agent && agent.color ? agent.color : "#000";
          agentIcon.style.textShadow = "1px 2px 3px black";
        }
      }

      this.previousIcon = agentIcon || null;

      switch (cellStatus.entityType) {
        case "Pedestrian":
        case "pedestrian":
          if (!agent) {
            this.addEntityToState("Pedestrian", row, col);
            break;
          }
          this.carjanState.set("properties", "pedestrian");
          this.carjanState.set("latestEntityProperty", "pedestrian");
          break;
        case "Vehicle":
        case "vehicle":
          this.carjanState.set("properties", "vehicle");
          this.carjanState.set("latestEntityProperty", "vehicle");

          break;
        case "Autonomous":
        case "autonomous":
          this.carjanState.set("properties", "autonomous");
          this.carjanState.set("latestEntityProperty", "autonomous");
          break;
        case "Obstacle":
        case "obstacle":
          this.carjanState.set("properties", "obstacle");
          this.carjanState.set("latestEntityProperty", "obstacle");
          break;
        default:
          this.carjanState.set("properties", "scenario");
          break;
      }
    }
    const isEntityCell = cellStatus && cellStatus.occupied;
    if (e.button === 0) {
      if (isEntityCell && cellStatus.entityType !== "void") {
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
    this.draggingEntityType = null;
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
