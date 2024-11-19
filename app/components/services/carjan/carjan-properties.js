import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { computed } from "@ember/object";
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
  selectedPath: null,
  selectedHeading: null,
  pedestrianInput: null,
  entity: null,
  backupPath: null,
  pedestrianList: Array.from({ length: 49 }, (_, i) => {
    const id = String(i + 1).padStart(4, "0");
    return `pedestrian_${id}`;
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
    await this.loadCarModels();
    this.setProperties({
      carModels: this.carModels.Car,
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
        this.set(
          "selectedModel",
          this.carModels.find((model) => model.name === entityAtPosition.model)
        );
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
    }

    this.displayWaypointsInCell();
  }.observes("carjanState.currentCellPosition"),

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

  actions: {
    toggleGridInCarla(event) {
      const isChecked = event.target.checked;
      this.carjanState.setGridInCarla(isChecked.toString());
    },

    togglePathsInCarla(event) {
      const isChecked = event.target.checked;
      console.log("isChecked", isChecked);
      this.carjanState.setPathsInCarla(isChecked.toString());
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
      const [currentX, currentY] = this.carjanState.currentCellPosition || [];

      const matchingEntity = this.carjanState.agentData.find(
        (entity) => entity.x == currentX && entity.y == currentY
      );

      if (matchingEntity) {
        matchingEntity.label = this.entity.label;
      } else {
        if (currentX !== undefined && currentY !== undefined) {
          const entityId =
            String(currentX).padStart(2, "0") +
            String(currentY).padStart(2, "0");

          const newPedestrian = {
            entity: `http://example.com/carla-scenario#Entity${entityId}`,
            type: "Pedestrian",
            x: currentX,
            y: currentY,
            label: this.entity.label,
          };

          this.carjanState.set("agentData", [
            ...this.carjanState.agentData,
            newPedestrian,
          ]);
        }
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

    pickerOpened() {
      console.log("Farb-Picker geöffnet");
    },

    pickerClosed() {
      console.log("Farb-Picker geschlossen");
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
});
