import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { computed, observer } from "@ember/object";
import { htmlSafe } from "@ember/string";
import { run, next } from "@ember/runloop";

export default Component.extend({
  ajax: service(),
  store: service(),
  carjanState: service(),
  gridRows: 3,
  gridCols: 3,
  cells: null,
  gridCells: null,
  cellStatus: null,
  cellPosition: null,
  waypoints: null,
  isDragging: false,
  selectedPath: null,
  overlayColorpicker: 0,
  pathId: null,
  isDeletePathDialogOpen: false,
  original: "",
  changeOriginalFlag: true,
  pedestrianModels: null,
  selectedModel: null,
  vehicleModels: null,
  carModels: null,
  truckModels: null,
  vanModels: null,
  busModels: null,
  motorcycleModels: null,
  bicycleModels: null,
  isTooltipHidden: true,
  selectedHeading: null,
  pedestrianInput: null,
  entity: null,
  behaviors: null,
  selectedBehavior: null,
  backupPath: null,
  selectedDBox: null,
  isDeleteDBoxDialogOpen: false,
  dboxes: null,

  pedestrianList: Array.from({ length: 49 }, (_, i) => {
    const id = String(i + 1).padStart(4, "0");
    return `pedestrian_${id}`;
  }),
  safeColorStyle: computed("selectedPath.color", function () {
    return htmlSafe(`color: ${this.get("selectedPath.color")};`);
  }),
  safePathColorStyle: computed("path.color", function () {
    return htmlSafe(`color: ${this.get("path.color")};`);
  }),

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

  colors: {
    road: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim(),
    path: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary-2")
      .trim(),
    void: "#333333",
  },

  async init() {
    this._super(...arguments);
    this.setupGrid();
    this.fetchBehaviors();
    this.setupTabs();
    await this.loadCarModels();
    this.setProperties({
      normalCarModels: this.carModels.Car,
      truckModels: this.carModels.Truck,
      vanModels: this.carModels.Van,
      busModels: this.carModels.Bus,
      motorcycleModels: this.carModels.Motorcycle,
      bicycleModels: this.carModels.Bicycle,
    });
  },

  backgroundColor: computed("cellPosition", "carjanState.mapData", function () {
    const [row, col] = this.cellPosition;
    const mapData = this.carjanState.mapData;

    if (mapData && mapData[row] && mapData[row][col]) {
      const cellType = mapData[row][col];
      if (cellType === "r") {
        return this.colors.road;
      } else if (cellType === "p") {
        return this.colors.path;
      }
    }
    return this.colors.void;
  }),

  showProperties: computed("carjanState.properties", function () {
    switch (this.carjanState.properties) {
      case "path":
        this.set("selectedPath", this.carjanState.selectedPath);
        this.pathId = this.actions.getPathId(this.selectedPath);
        break;
      case "waypoint":
        this.cellStatus = this.carjanState.currentCellStatus;
        this.set("cellPosition", this.carjanState.currentCellPosition);
        this.waypoints = this.carjanState.waypoints;
        this.displayWaypointsInCell();
        break;
      default:
        break;
    }
    return this.carjanState.properties;
  }),

  selectedDBoxObserver: function () {
    let dbox = this.carjanState.selectedDBox;
    if (dbox) {
      console.log("dbox", dbox);
      const rgb = this.hexToRgb(dbox.color);
      const fill = this.rgbToRgba(this.lightenColor(rgb, 0.5), 0.8);
      const border = this.rgbToRgba(this.darkenColor(rgb, 0.5), 1);
      console.log("fill box and border box: ", fill, border);
      this.set("selectedDBox", {
        ...dbox,
        fillColor: fill,
        borderColor: border,
      });
    }
  }.observes("carjanState.selectedDBox"),

  selectedPathColorObserver: function () {
    this.set("selectedPath", this.carjanState.selectedPath);
  }.observes("carjanState.selectedPath.color"),

  waypointsObserver: function () {
    this.waypoints = this.carjanState.get("waypoints");
    this.displayWaypointsInCell();
  }.observes("carjanState.waypoints"),

  selectedPathObserver: function () {
    if (
      this.showProperties === "pedestrian" ||
      this.showProperties === "vehicle"
    ) {
      if (this.selectedPath) {
        this.set("entity.color", this.selectedPath.color);
        this.set("carjanState.color", this.selectedPath.color);
        this.set("entity.heading", "path");
      } else {
        this.set("entity.color", null);
        this.set("carjanState.color", null);
      }
      this.updateMatchingEntity();
    }
  }.observes("selectedPath"),

  positionObserver: function () {
    let position = this.carjanState.get("currentCellPosition");

    this.set("cellPosition", [position[0], position[1]]);
    const entityAtPosition = this.carjanState.agentData.find(
      (entity) =>
        entity.x.toString() === position[0] &&
        entity.y.toString() === position[1]
    );
    if (entityAtPosition) {
      this.set("entity", entityAtPosition);
      if (entityAtPosition.type === "Vehicle") {
        let carmodel;
        Object.values(this.carModels).forEach((models) => {
          if (!carmodel) {
            carmodel = models.find(
              (model) => model.name === entityAtPosition.model
            );
          }
        });
        this.set("selectedModel", carmodel);
      } else if (entityAtPosition.type === "Pedestrian") {
        this.set("selectedModel", entityAtPosition.model);
      }

      const entityPath = this.carjanState.paths.find(
        (path) => path.path === entityAtPosition.followsPath
      );

      if (entityPath) {
        this.set("selectedPath", entityPath);
      } else {
        this.set("selectedPath", null);
      }

      if (entityAtPosition.heading) {
        this.set("entity.heading", entityAtPosition.heading);
      }

      if (entityAtPosition.decisionBox) {
        console.log(
          "entityatposition decisionbox",
          entityAtPosition.decisionBox
        );
        console.log("dboxes", this.carjanState.dboxes);
        const box = this.carjanState.dboxes.find(
          (dbox) => dbox.id === entityAtPosition.decisionBox
        );

        console.log("box", box);

        const rgb = this.hexToRgb(box.color);
        const fill = this.rgbToRgba(this.lightenColor(rgb, 0.5), 0.8);
        const border = this.rgbToRgba(this.darkenColor(rgb, 0.5), 1);

        this.set("selectedDBox", {
          ...box,
          fillColor: fill,
          borderColor: border,
        });
        console.log("this.selectedDBox", this.selectedDBox);
      }

      if (entityAtPosition.behavior) {
        this.set(
          "selectedBehavior",
          this.behaviors.find(
            (behavior) => behavior.uri === entityAtPosition.behavior
          )
        );
      }
    }

    this.displayWaypointsInCell();
  }.observes("carjanState.currentCellPosition"),

  dboxesObserver: observer("carjanState.dboxes.@each", function () {
    this.set("dboxes", this.carjanState.dboxes);
    this.set(
      "dboxes",
      this.dboxes.map((dbox) => {
        const rgb = this.hexToRgb(dbox.color);
        const fill = this.rgbToRgba(this.lightenColor(rgb, 0.5), 0.8);
        const border = this.rgbToRgba(this.darkenColor(rgb, 0.5), 1);
        console.log("fill and border", fill, border);
        return {
          ...dbox,
          fillColor: fill,
          borderColor: border,
        };
      })
    );
    console.log("observed dboxes", this.dboxes);
  }),

  async fetchBehaviors() {
    const sparqlQuery = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX bt: <http://www.ajan.de/behavior/bt-ns#>
      SELECT ?bt ?label
      WHERE {
        ?bt a bt:BehaviorTree .
        ?bt rdfs:label ?label .
      }
    `;
    const repoURL = `http://localhost:8090/rdf4j/repositories/behaviors`;
    const headers = {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    try {
      const response = await fetch(
        `${repoURL}?query=${encodeURIComponent(sparqlQuery)}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      const data = await response.json();
      const behaviors = data.results.bindings.map((binding) => ({
        uri: binding.bt.value,
        label: binding.label.value,
      }));
      this.set("behaviors", behaviors);
    } catch (error) {
      console.error("Failed to fetch behavior trees:", error);
    }
  },

  getNumericPositionIndex(positionInCell) {
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

  async loadCarModels() {
    const response = await fetch("/assets/carjan/car_models.json");
    const carModels = await response.json();
    this.carModels = carModels;
  },

  updatePath() {
    const oldPathURI = this.selectedPath.path;
    const newPath = { ...this.selectedPath };
    const updatedPaths = this.carjanState.paths.map((path) => {
      if (path.path === oldPathURI) {
        return newPath;
      }
      return path;
    });
    this.carjanState.setPaths(updatedPaths);
  },

  async moveWaypointWithinGrid(currentPositionInCell, newPositionInCell) {
    const oldWaypoint = await this.waypoints.find(
      (wp) =>
        wp.x === this.cellPosition[0] &&
        wp.y === this.cellPosition[1] &&
        wp.positionInCell === currentPositionInCell
    );

    let newWaypoint = { ...oldWaypoint };

    const oldWaypointURI = oldWaypoint.waypoint;

    const newPositionIndex = this.getNumericPositionIndex(newPositionInCell);
    const updatedWaypointURI = `http://example.com/carla-scenario#Waypoint${String(
      oldWaypoint.x
    ).padStart(2, "0")}${String(oldWaypoint.y).padStart(
      2,
      "0"
    )}_${newPositionIndex}`;

    newWaypoint.waypoint = updatedWaypointURI;
    newWaypoint.positionInCell = newPositionInCell;

    const updatedPaths = this.carjanState.paths.map((path) => {
      const updatedPathWaypoints = path.waypoints.map((wp) => {
        if (wp.waypoint === oldWaypointURI) {
          return {
            ...wp,
            waypoint: updatedWaypointURI,
            positionInCell: newPositionInCell,
          };
        }
        return wp;
      });

      return {
        ...path,
        waypoints: updatedPathWaypoints,
      };
    });

    let allWaypoints = [
      ...this.waypoints.filter((wp) => wp.waypoint !== oldWaypointURI),
      newWaypoint,
    ];

    this.removeEntityFromGrid(oldWaypoint.positionInCell);

    this.waypoints = allWaypoints;
    this.carjanState.setWaypoints(allWaypoints);
    this.carjanState.setPaths(updatedPaths);
  },

  removeEntityFromGrid(positionInCell) {
    run.scheduleOnce("afterRender", this, function () {
      const positionIndex = this.getPositionIndex(positionInCell);
      const row = Math.floor(positionIndex[0]);
      const col = Math.floor(positionIndex[1]);

      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );

      if (gridElement) {
        gridElement.removeAttribute("draggable");
        gridElement.innerHTML = "";
      } else {
        console.warn(
          `Kein Grid-Element gefunden für Zelle: row=${row}, col=${col}`
        );
      }
    });
  },

  getPositionIndex(positionInCell) {
    const positionMap = {
      "top-left": [0, 0],
      "top-center": [0, 1],
      "top-right": [0, 2],
      "middle-left": [1, 0],
      "middle-center": [1, 1],
      "middle-right": [1, 2],
      "bottom-left": [2, 0],
      "bottom-center": [2, 1],
      "bottom-right": [2, 2],
    };
    return positionMap[positionInCell] ? positionMap[positionInCell] : 0;
  },

  getPositionByIndex(x, y) {
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
    return positionMap[x * 3 + y];
  },

  async displayWaypointsInCell() {
    let cells = this.gridCells;
    if (this.cellStatus === null) {
      return;
    }

    let waypoints = this.carjanState.waypoints;
    waypoints = waypoints.filter(
      (wp) => wp.x === this.cellPosition[0] && wp.y === this.cellPosition[1]
    );

    waypoints.forEach((waypoint) => {
      waypoint.positionIndex = this.getPositionIndex(waypoint.positionInCell);
    });

    run.scheduleOnce("afterRender", this, function () {
      cells.forEach((cell) => {
        const row = parseInt(cell.row, 10);
        const col = parseInt(cell.col, 10);
        const gridElement = this.element.querySelector(
          `.grid-cell[data-row="${row}"][data-col="${col}"]`
        );

        if (gridElement && waypoints) {
          const matchingWaypoint = waypoints.find(
            (waypoint) =>
              waypoint.positionIndex[0] === row &&
              waypoint.positionIndex[1] === col
          );

          gridElement.innerHTML = "";
          gridElement.removeAttribute("draggable");

          if (matchingWaypoint) {
            this.addWaypointToGrid(row, col, matchingWaypoint.positionInCell);
          }
        }
      });
    });
  },

  addWaypointToGrid(inputRow, inputCol, posInCell) {
    const row = parseInt(inputRow, 10);
    const col = parseInt(inputCol, 10);
    const gridElement = this.element.querySelector(
      `.grid-cell[data-row="${row}"][data-col="${col}"]`
    );
    if (gridElement) {
      gridElement.innerHTML = "";
      const waypointIcon = document.createElement("i");
      waypointIcon.classList.add("icon", "map", "marker", "alternate");
      waypointIcon.style.fontSize = "24px";
      waypointIcon.style.display = "flex";
      waypointIcon.style.alignItems = "center";
      waypointIcon.style.justifyContent = "center";
      waypointIcon.style.height = "100%";
      waypointIcon.style.width = "100%";
      waypointIcon.style.pointerEvents = "none";

      waypointIcon.setAttribute("data-position-in-cell", posInCell);

      gridElement.setAttribute("draggable", "true");
      gridElement.appendChild(waypointIcon);
    }
  },

  recoverWaypoint() {
    this.addWaypointToGrid(
      this.draggingWaypoint.x,
      this.draggingWaypoint.y,
      this.draggingWaypoint.positionInCell
    );
    this.draggingWaypoint = null;
  },

  setupGrid() {
    let cells = [];
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        cells.push({ row, col });
      }
    }
    this.set("gridCells", cells);
  },

  async deleteWaypoint(positionInCell) {
    const waypointToDelete = await this.waypoints.find(
      (wp) =>
        wp.x === this.cellPosition[0] &&
        wp.y === this.cellPosition[1] &&
        wp.positionInCell === positionInCell
    );

    if (!waypointToDelete) {
      console.warn("Waypoint not found for deletion.");
      return;
    }

    const waypointURI = waypointToDelete.waypoint;

    const updatedPaths = this.carjanState.paths.map((path) => {
      const filteredWaypoints = path.waypoints.filter(
        (wp) => wp.waypoint !== waypointURI
      );
      return {
        ...path,
        waypoints: filteredWaypoints,
      };
    });

    const updatedWaypoints = this.waypoints.filter(
      (wp) => wp.waypoint !== waypointURI
    );
    this.removeEntityFromGrid(positionInCell);

    this.waypoints = updatedWaypoints;
    this.carjanState.setWaypoints(updatedWaypoints);
    this.carjanState.setPaths(updatedPaths);
  },

  updateMatchingEntity() {
    const [currentX, currentY] = this.carjanState.currentCellPosition || [];
    const matchingEntityIndex = this.carjanState.agentData.findIndex(
      (entity) =>
        entity.x.toString() === currentX && entity.y.toString() === currentY
    );
    if (matchingEntityIndex !== -1) {
      this.carjanState.agentData[matchingEntityIndex] = {
        ...this.carjanState.agentData[matchingEntityIndex],
        ...this.entity,
      };
    }
  },

  updateEntityName() {
    const [currentX, currentY] = this.carjanState.currentCellPosition || [];
    const entityName = this.entity.label;

    const matchingEntity = this.carjanState.agentData.find(
      (entity) => entity.x == currentX && entity.y == currentY
    );

    if (matchingEntity) {
      Ember.set(matchingEntity, "label", entityName);
    } else {
      if (currentX !== undefined && currentY !== undefined) {
        const entityId =
          String(currentX).padStart(2, "0") + String(currentY).padStart(2, "0");

        const newPedestrian = {
          entity: `http://example.com/carla-scenario#Entity${entityId}`,
          type: "Pedestrian",
          x: currentX,
          y: currentY,
          label: entityName,
        };

        this.carjanState.set("agentData", [
          ...this.carjanState.agentData,
          newPedestrian,
        ]);
      }
    }
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
    context.clearRect(0, 0, canvas.width, canvas.height);

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

  hexToRgb(hex) {
    return [
      parseInt(hex.substring(1, 3), 16),
      parseInt(hex.substring(3, 5), 16),
      parseInt(hex.substring(5, 7), 16),
    ];
  },

  updateDBoxColor(colorHex) {
    const updatedDBoxes = this.carjanState.dboxes.map((dbox) =>
      dbox.id === this.selectedDBox.id ? { ...dbox, color: colorHex } : dbox
    );
    this.carjanState.setDBoxes(updatedDBoxes);
    console.log("Updated Decision Box Color:", this.carjanState.dboxes);
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

  // Hilfsfunktion zur Validierung und Bereinigung von Labels
  sanitizeLabel(label) {
    // Entfernt Sonderzeichen, Umlaute und Leerzeichen
    return label
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_") // Ersetzt ungültige Zeichen mit "_"
      .replace(/_{2,}/g, "_"); // Mehrere Unterstriche auf einen reduzieren
  },

  actions: {
    redrawDBox() {
      this.carjanState.set("canvasMode", "dbox");
      this.carjanState.setSelectedDBox(this.selectedDBox);
    },

    bindDecisionBox(dbox) {
      console.log("Selected Decision Box:", dbox);
      this.set("entity.decisionBox", dbox.id);
      this.updateMatchingEntity();
    },

    async openDeleteDBoxDialog() {
      this.set("isDeleteDBoxDialogOpen", true);
      console.log("this.isDeleteDBoxDialogOpen", this.isDeleteDBoxDialogOpen);
      next(() => {
        this.$(".ui.basic.modal")
          .modal({
            closable: false,
            transition: "scale",
            duration: 500,
            dimmerSettings: { duration: { show: 500, hide: 500 } },
          })
          .modal("show");
      });
    },

    cancelDeleteDBox() {
      this.set("isDeleteDBoxDialogOpen", false);
    },

    confirmDeleteDBox() {
      // Entferne die ausgewählte Decision Box aus der Liste
      const updatedDBoxes = this.carjanState.dboxes.filter(
        (dbox) => dbox.label !== this.selectedDBox.label
      );

      console.log("updated dboxes after delete", updatedDBoxes);

      // Aktualisiere den State
      this.carjanState.setDBoxes(updatedDBoxes);
      this.carjanState.saveRequest();

      // Schließe den Dialog und reset die Auswahl
      this.set("isDeleteDBoxDialogOpen", false);
      this.set("selectedDBox", null);
      this.carjanState.set("properties", "scenario");
    },

    updateDBoxLabel() {
      // Validierung und Bereinigung des Labels
      const sanitizedLabel = this.sanitizeLabel(this.selectedDBox.label);

      // Aktuelles Label aktualisieren
      this.set("selectedDBox.label", sanitizedLabel);

      // Aktualisierung der DBox-Liste im carjanState
      const dboxes = this.carjanState.dboxes || [];
      const updatedDBoxes = dboxes.map((dbox) =>
        dbox.id === this.selectedDBox.id
          ? { ...dbox, label: sanitizedLabel }
          : dbox
      );

      this.carjanState.setDBoxes(updatedDBoxes);
    },

    userMovedDBoxColorPicker(colorHex) {
      // Vorschau auf Canvas aktualisieren
      this.set("selectedDBox.color", colorHex);
      this.updateDBoxColor(colorHex);
      this.markBoundingBoxCorners(
        this.selectedDBox.startX,
        this.selectedDBox.endX,
        this.selectedDBox.startY,
        this.selectedDBox.endY,
        colorHex
      );
    },

    // Endgültige Farbe übernehmen
    updateDBoxColorAction(colorHex) {
      this.updateDBoxColor(colorHex);
    },

    // Delete Decision Box
    deleteDBox() {
      const dboxes = this.carjanState.dboxes || [];
      const updatedDBoxes = dboxes.filter(
        (dbox) => dbox.id !== this.selectedDBox.id
      );
      this.carjanState.set("dboxes", updatedDBoxes);
      this.carjanState.set("selectedDBox", null);
      this.carjanState.set("properties", "scenario"); // Return to scenario view
    },

    toggleGridInCarla(event) {
      const isChecked = event.target.checked;
      this.carjanState.setGridInCarla(isChecked.toString());
    },

    togglePathsInCarla(event) {
      const isChecked = event.target.checked;
      this.carjanState.setPathsInCarla(isChecked.toString());
    },

    toggleLoadLayersCarla(event) {
      const isChecked = event.target.checked;
      this.carjanState.setLoadLayersInCarla(isChecked.toString());
    },

    findCurrentEntity() {
      const [row, col] = this.carjanState.currentCellPosition || [];
      return this.carjanState.entities.find(
        (entity) => entity.x === row.toString() && entity.y === col.toString()
      );
    },

    displayPath() {
      this.carjanState.setSelectedPath(this.selectedPath);
      this.set("backupPath", this.selectedPath);
    },

    clearPathDrawing() {
      const mainElement = document.getElementById("main");
      mainElement.innerHTML = "";
      this.carjanState.setSelectedPath(null);
      this.set("selectedPath", this.backupPath);
      const allWaypoints = document.querySelectorAll(
        ".map.marker.alternate, .flag.outline"
      );
      allWaypoints.forEach((waypointIcon) => {
        waypointIcon.classList.remove("flag", "outline");
        waypointIcon.classList.remove("map", "marker", "alternate");
        waypointIcon.classList.add("map", "marker", "alternate");
        waypointIcon.style.color = "#000";
        waypointIcon.style.transform = "scale(1)";
        waypointIcon.style.textShadow = "none";
      });
    },

    selectPath(path) {
      this.set("selectedPath", path);
      this.set("backupPath", path);
      this.set("entity.followsPath", path.path);
      this.updateMatchingEntity();
    },

    clearSelectedPath() {
      this.set("selectedPath", null);
      this.set("entity.followsPath", null);
      this.updateMatchingEntity();

      const dropdownElement = this.$("#pathDropdown");
      if (dropdownElement && dropdownElement.length) {
        dropdownElement.dropdown("clear");
      }
    },

    selectBehavior(behavior) {
      this.set("selectedBehavior", behavior);
      this.set("entity.behavior", behavior.uri);
      console.log("Selected Behavior Tree:", behavior);
      this.updateMatchingEntity();
    },

    clearSelectedBehavior() {
      this.set("selectedBehavior", null);
      this.set("entity.behavior", null);
      console.log("Cleared selected behavior tree.");
      this.updateMatchingEntity();
      const dropdownElement = this.$("#behaviorDropdown");
      if (dropdownElement && dropdownElement.length) {
        dropdownElement.dropdown("clear");
      }
    },

    selectHeading(heading) {
      this.set("selectedHeading", heading);
      this.set("entity.heading", heading);
      this.updateMatchingEntity();
      this.carjanState.set("chevronDirection", heading);
    },

    selectModel(model) {
      this.set("selectedModel", model);
      if (this.entity) {
        if (typeof model === "string") {
          this.set("entity.model", model);
        } else if (model) {
          this.set("entity.model", model.name);
        }
      }
      this.updateMatchingEntity();
    },

    showTooltip() {
      this.set("isTooltipHidden", false);
    },

    hideTooltip() {
      this.set("isTooltipHidden", true);
    },

    inputFocusIn() {
      if (this.changeOriginalFlag && this.selectedPath) {
        this.original = this.selectedPath.description;
      }
      this.changeOriginalFlag = false;
    },

    checkEntityLabel() {
      if (this.entity) {
        const entityLabel = this.entity.label;
        const isLabelEmpty = entityLabel === "";
        this.set("isLabelEmpty", isLabelEmpty);

        if (isLabelEmpty) {
          this.set("hasError", true);
          this.set("errorMessage", "Empty entity label. Please enter a label.");
          return false;
        }

        const isValidLabel = /^[a-zA-Z0-9_-]+$/.test(entityLabel);
        if (!isValidLabel) {
          this.set("hasError", true);
          this.set(
            "errorMessage",
            "Invalid entity label. Only letters, numbers, underscores, and hyphens are allowed."
          );
          return false;
        }

        const entities = this.carjanState.agentData || [];
        const isDuplicateLabel = entities.some((entity) => {
          return entity.label === entityLabel && entity !== this.entity;
        });

        if (isDuplicateLabel) {
          this.set("hasError", true);
          this.set(
            "errorMessage",
            "Duplicate entity label found. Please use a unique label."
          );
          return false;
        }

        this.set("hasError", false);
        this.set("errorMessage", "");
        this.updateEntityName();
        return true;
      }
      return false;
    },

    checkPathDescription() {
      if (this.selectedPath) {
        const pathDescription = this.selectedPath.description.trim();
        const isDescriptionEmpty = pathDescription.trim() === "";
        this.set("isDescriptionEmpty", isDescriptionEmpty);

        if (isDescriptionEmpty) {
          this.set("hasError", true);
          this.set(
            "errorMessage",
            "Empty path description. Please enter a description."
          );
          return;
        }

        const isValidDescription = /^[a-zA-Z0-9_ ]+$/.test(pathDescription);
        if (!isValidDescription) {
          this.set("hasError", true);
          this.set(
            "errorMessage",
            "Invalid path description. Only letters, numbers, spaces, and underscores are allowed."
          );
          return;
        }
        const paths = this.carjanState.paths || [];
        const trimmedDescription = pathDescription.trim();

        const isDuplicateDescription = paths.some((path) => {
          const isSameDescription =
            path.description.trim() === trimmedDescription;

          return (
            isSameDescription && trimmedDescription !== this.original.trim()
          );
        });

        if (isDuplicateDescription) {
          this.set("hasError", true);
          this.set(
            "errorMessage",
            "Duplicate path description found. Please use a unique description."
          );
          return;
        }

        this.set("hasError", false);
        this.set("errorMessage", "");
      }
    },

    inputFocusOut() {
      if (!this.hasError) {
        let allPaths = this.carjanState.paths;

        let updatedPaths = allPaths;
        if (this.selectedPath) {
          allPaths.map((path) =>
            path.path === this.selectedPath.path ? this.selectedPath : path
          );
        }

        this.carjanState.set("paths", updatedPaths);
      }
    },

    inputFocusOutPedestrian() {
      if (this.actions.checkEntityLabel()) {
        this.updateEntityName();
      }
    },

    inputFocusInPedestrian() {
      const [currentX, currentY] = this.carjanState.currentCellPosition || [];

      const matchingEntity = this.carjanState.agentData.find(
        (entity) => entity.x == currentX && entity.y == currentY
      );
    },

    async openDeletePathDialog(path) {
      this.set("selectedPath", path);
      this.set("isDeletePathDialogOpen", true);

      next(() => {
        this.$(".ui.basic.modal")
          .modal({
            closable: false,
            transition: "scale",
            duration: 500,
            dimmerSettings: { duration: { show: 500, hide: 500 } },
          })
          .modal("show");
      });
    },

    confirmPathDelete() {
      this.$(".ui.modal").modal("hide");

      const pathToDelete = this.selectedPath;
      if (pathToDelete) {
        const updatedPaths = this.carjanState.paths.filter(
          (path) => path.path !== pathToDelete.path
        );
        this.set("isDeletePathDialogOpen", false);
        this.set("selectedPath", null);
        this.carjanState.setPaths(updatedPaths);
      }
      this.carjanState.saveRequest();
    },

    cancelPathDelete() {
      this.$(".ui.modal").modal("hide");
      this.set("isDeletePathDialogOpen", false);
    },

    openDrawPathModal() {
      this.carjanState.setPathMode(true);
      this.set("isDrawPathModalOpen", true);

      next(() => {
        const modalElement = this.$(".ui.draw-path.modal");

        if (modalElement.length) {
          modalElement.modal({
            closable: false,
            transition: "scale",
            duration: 500,
            dimmerSettings: { duration: { show: 500, hide: 500 } },
          });
          modalElement.modal("show");
        }
      });
    },

    confirmDrawPath() {
      let newPath = this.carjanState.pathInProgress;
      if (newPath && newPath.waypoints.length > 0) {
        this.set("selectedPath.waypoints", newPath.waypoints);
        let allPaths = this.carjanState.paths;

        let updatedPaths = allPaths.map((path) =>
          path.path === this.selectedPath.path ? this.selectedPath : path
        );
        this.carjanState.set("paths", updatedPaths);
        this.carjanState.setPathMode(false);
        this.carjanState.saveRequest();
      }
    },

    retryDrawing() {
      const pathOverlay = document.getElementById(this.pathId);
      if (pathOverlay) {
        pathOverlay.innerHTML = "";
      }
      this.carjanState.initPathDrawing();
    },

    closeDrawPathModal() {
      this.$(".ui.modal").modal("hide");
      this.set("isDrawPathModalOpen", false);
    },

    setWeather(event) {
      const selectedWeather = event.target.value;
      this.carjanState.setWeather(selectedWeather);
    },

    setCameraPosition(event) {
      const selectedCameraPosition = event.target.value;
      this.carjanState.setCameraPosition(selectedCameraPosition);
    },

    setCategory(event) {
      const selectedCategory = event.target.value;
      this.carjanState.setCategory(selectedCategory);
    },

    async dropOnCell(event) {
      event.preventDefault();
      const trash = document.getElementById("trash");
      if (event.target === trash) {
        if (this.draggingWaypoint) {
          this.deleteWaypoint(this.draggingWaypoint.positionInCell);
        }
        return;
      }
      const row = parseInt(event.target.dataset.row, 10);
      const col = parseInt(event.target.dataset.col, 10);
      if (this.draggingWaypoint) {
        const newPositionInCell = this.getPositionByIndex(row, col);
        const isOccupied = this.waypoints.find(
          (wp) =>
            wp.x === this.cellPosition[0] &&
            wp.y === this.cellPosition[1] &&
            wp.positionInCell === newPositionInCell
        );
        if (
          newPositionInCell !== this.draggingWaypoint.positionInCell &&
          !isOccupied
        ) {
          this.moveWaypointWithinGrid(
            this.draggingWaypoint.positionInCell,
            newPositionInCell
          ).then(() => {
            this.displayWaypointsInCell();
          });
        } else {
          this.recoverWaypoint();
        }

        this.isDragging = false;
        this.draggingWaypoint = null;
      }
    },

    closeWaypointEditor() {
      this.carjanState.set("properties", "scenario");
    },

    dragLeave(event) {
      event.target.classList.remove("cell-hover-allowed");
      event.target.classList.remove("cell-hover-not-allowed");
      event.target.style.cursor = "default";
    },

    dragStart(event) {
      const row = parseInt(event.target.dataset.row, 10);
      const col = parseInt(event.target.dataset.col, 10);
      const currentPositionInCell = this.getPositionByIndex(row, col);
      const waypoint = this.waypoints.find(
        (wp) =>
          wp.x === this.cellPosition[0] &&
          wp.y === this.cellPosition[1] &&
          wp.positionInCell === currentPositionInCell
      );
      if (waypoint) {
        this.draggingWaypoint = waypoint;
        this.draggingWaypointPositionInCell = currentPositionInCell;

        event.dataTransfer.setData("text/plain", "waypoint");
        let waypointIcon = event.target.querySelector(".icon.map.marker");
        if (waypointIcon) {
          event.dataTransfer.setDragImage(waypointIcon, 12, 12);
        }
      } else {
        event.preventDefault();
      }
    },

    allowDrop(event) {
      event.preventDefault();
    },

    colorChanged() {
      this.updatePath();
    },

    colorPickerMouseLeave() {
      this.updatePath();
    },

    getPathId(path) {
      const pathUrl = path.path;
      return pathUrl.split("#").pop();
    },

    userMovedColorPicker(color) {
      let previewBox = document.getElementById(this.selectedPath.path);
      window.requestAnimationFrame(() => {
        if (previewBox) {
          previewBox.style.setProperty("--triangle-color", color);
        }
        this.carjanState.setPathColor(color);
      });
    },
  },

  didRender() {
    this._super(...arguments);
    run.scheduleOnce("afterRender", this, function () {
      this.$(".ui.dropdown").dropdown({});
      this.$(".ui.toggle.checkbox").checkbox();
      this.$(".menu .item").tab();
    });
  },

  onMouseDown(event) {
    const target = event.target;
    if (
      target.classList.contains("map") &&
      target.classList.contains("marker")
    ) {
      const row = target.closest(".grid-cell").dataset.row;
      const col = target.closest(".grid-cell").dataset.col;

      this.draggingWaypoint = {
        row: parseInt(row, 10),
        col: parseInt(col, 10),
        originalPositionInCell: this.getPositionByIndex(
          parseInt(row, 10),
          parseInt(col, 10)
        ),
      };

      event.currentTarget.style.cursor = "grabbing";
      this.isDragging = true;
    }
  },

  setupTabs() {
    $(document).ready(function () {
      $(".menu .item").tab();
    });
  },
});
