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

  colors: {
    road: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim(),
    path: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary-2")
      .trim(),
    void: "#333333",
  },

  init() {
    this._super(...arguments);
    this.setupGrid();
    if (this.selectedPath && this.selectedPath.color) {
      this.set("teamColor", this.selectedPath.color);
    }
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

  showWaypointEditor: computed("carjanState.openWaypointEditor", function () {
    this.cellStatus = this.carjanState.currentCellStatus;
    this.cellPosition = this.carjanState.currentCellPosition;
    this.waypoints = this.carjanState.waypoints;
    this.displayWaypointsInCell();
    return this.carjanState.openWaypointEditor;
  }),

  showPathEditor: computed("carjanState.openPathEditor", function () {
    const isOpen = this.carjanState.openPathEditor;
    if (isOpen) {
      this.set("selectedPath", this.carjanState.selectedPath);
      this.pathId = this.actions.getPathId(this.selectedPath);
      if (this.selectedPath && this.selectedPath.color) {
        this.set("teamColor", this.selectedPath.color);
      }
    }
    return isOpen;
  }),

  waypointsObserver: function () {
    this.waypoints = this.carjanState.get("waypoints");
    this.displayWaypointsInCell();
  }.observes("carjanState.waypoints"),

  positionObserver: function () {
    let position = this.carjanState.get("currentCellPosition");

    this.set("cellPosition", [position[0], position[1]]);
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

  async updatePath() {
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
        } else {
          console.warn(
            `Kein Element gefunden für Zelle: row=${row}, col=${col}`
          );
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

  actions: {
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

        this.$(".sp-container").css({
          mixBlendMode: "multiply",
          pointerEvents: "none",
        });
      });
    },

    confirmPathDelete() {
      this.$(".ui.modal").modal("hide");

      const pathToDelete = this.selectedPath;
      if (pathToDelete) {
        console.log("Lösche Pfad", pathToDelete);
        // Entferne den Pfad aus carjanState.paths
        const updatedPaths = this.carjanState.paths.filter(
          (path) => path.path !== pathToDelete.path
        );

        console.log("Pfade", updatedPaths);

        // Schließe das Modal und setze selectedPath zurück
        this.set("isDeletePathDialogOpen", false);
        this.set("selectedPath", null);
        this.carjanState.setPaths(updatedPaths);
      }

      console.log("Pfad gelöscht", this.carjanState.paths);
      this.carjanState.saveRequest();
    },

    cancelPathDelete() {
      this.$(".ui.modal").modal("hide");
      this.set("isDeletePathDialogOpen", false);

      //timeout 500ms then remove overlay
      setTimeout(() => {
        this.$(".sp-container").css({
          mixBlendMode: "normal",
          pointerEvents: "auto",
        });
      }, 500);
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

    dropOnBackground() {
      return;
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
    async colorChanged(newColor) {
      this.set("teamColor", newColor);
      if (this.selectedPath) {
        this.set("selectedPath.color", newColor);
      }
      this.selectedPath.color = newColor;
      await this.updatePath();
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
      if (previewBox) {
        window.requestAnimationFrame(() => {
          previewBox.style.setProperty("--triangle-color", color);
        });
      }
    },
  },

  didRender() {
    this._super(...arguments);
    run.scheduleOnce("afterRender", this, function () {
      this.$(".ui.dropdown").dropdown({});
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
