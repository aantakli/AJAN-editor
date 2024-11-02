import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { computed } from "@ember/object";
import { run } from "@ember/runloop";

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
  },

  // Hintergrundfarbe basierend auf der `cellPosition` und `mapData`
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

  waypointsObserver: function () {
    console.log("waypoints in properties", this.carjanState.get("waypoints"));
    this.waypoints = this.carjanState.get("waypoints");
    this.displayWaypointsInCell();
  }.observes("carjanState.waypoints"),

  positionObserver: function () {
    console.log(
      "currentCellPosition in properties",
      this.carjanState.get("currentCellPosition")
    );

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

  async moveWaypointWithinGrid(currentPositionInCell, newPositionInCell) {
    // Finde den ursprünglichen Waypoint anhand von x, y und positionInCell
    const oldWaypoint = await this.waypoints.find(
      (wp) =>
        wp.x === this.cellPosition[0] &&
        wp.y === this.cellPosition[1] &&
        wp.positionInCell === currentPositionInCell
    );

    // Erstelle eine tiefe Kopie des alten Waypoints
    let newWaypoint = { ...oldWaypoint };

    // Speichere den alten Waypoint-URI
    const oldWaypointURI = oldWaypoint.waypoint;

    // Berechne den neuen Suffix basierend auf newPositionInCell
    const newPositionIndex = this.getNumericPositionIndex(newPositionInCell);
    const updatedWaypointURI = `http://example.com/carla-scenario#Waypoint${String(
      oldWaypoint.x
    ).padStart(2, "0")}${String(oldWaypoint.y).padStart(
      2,
      "0"
    )}_${newPositionIndex}`;

    newWaypoint.waypoint = updatedWaypointURI;
    newWaypoint.positionInCell = newPositionInCell;

    // Aktualisiere die Pfade in carjanState, die diesen Waypoint enthalten
    const updatedPaths = this.carjanState.paths.map((path) => {
      const updatedPathWaypoints = path.waypoints.map((wp) => {
        // Ersetze den alten Waypoint-URI durch den neuen, wenn er im Pfad enthalten ist
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
    console.log("allWaypoints", allWaypoints);
    this.carjanState.setWaypoints(allWaypoints);
    this.carjanState.setPaths(updatedPaths);
  },

  removeEntityFromGrid(positionInCell) {
    run.scheduleOnce("afterRender", this, function () {
      const positionIndex = this.getPositionIndex(positionInCell);
      const row = Math.floor(positionIndex[0]);
      const col = Math.floor(positionIndex[1]);

      // Suche das Grid-Element und das spezifische Waypoint-Icon darin
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

  // Funktion zur Anzeige der Waypoints in den Zellen
  async displayWaypointsInCell() {
    let cells = this.gridCells;
    if (this.cellStatus === null) {
      return;
    }

    let waypoints = this.carjanState.waypoints;
    console.log("cellPosition in displayWaypointsInCell", this.cellPosition);
    // only those with x,y = this.cellPosition
    waypoints = waypoints.filter(
      (wp) => wp.x === this.cellPosition[0] && wp.y === this.cellPosition[1]
    );

    // Konvertiere positionInCell für jeden Waypoint in [row, col]-Koordinaten
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
          // Überprüfe, ob ein Waypoint in der Zelle vorhanden ist
          const matchingWaypoint = waypoints.find(
            (waypoint) =>
              waypoint.positionIndex[0] === row &&
              waypoint.positionIndex[1] === col
          );

          // Entferne falsche Waypoint-Icons aus der Zelle
          gridElement.innerHTML = "";
          gridElement.removeAttribute("draggable");

          // Nur wenn ein passender Waypoint gefunden wurde, Icon hinzufügen
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

      // Füge das Waypoint-Icon zur Zelle hinzu
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
    console.log("Recovered Waypoint");
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
        // Nur verschieben, wenn das neue Ziel sich vom originalen unterscheidet
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

        // Reset nach dem Drop
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
      // Finde den Waypoint in der Zelle, basierend auf den Koordinaten und der aktuellen `positionInCell`
      const currentPositionInCell = this.getPositionByIndex(row, col);
      console.log("currentPositionInCell", currentPositionInCell);
      console.log("this.cellPosition", this.cellPosition);
      const waypoint = this.waypoints.find(
        (wp) =>
          wp.x === this.cellPosition[0] &&
          wp.y === this.cellPosition[1] &&
          wp.positionInCell === currentPositionInCell
      );
      console.log("waypoint", waypoint);
      if (waypoint) {
        // Speichere den Waypoint, seine aktuelle Position und `positionInCell` für den Drop
        this.draggingWaypoint = waypoint;
        this.draggingWaypointPositionInCell = currentPositionInCell;

        // Setze das Drag-Image auf den Waypoint
        event.dataTransfer.setData("text/plain", "waypoint");
        let waypointIcon = event.target.querySelector(".icon.map.marker");
        console.log("waypointIcon", waypointIcon);
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
  },

  onMouseDown(event) {
    const target = event.target;
    console.log("target", target);
    console.log("target.classList", target.classList);
    // Prüfe, ob das Ziel ein Waypoint-Icon ist
    if (
      target.classList.contains("map") &&
      target.classList.contains("marker")
    ) {
      // Hole die Zeile und Spalte der Zelle, in der der Waypoint ist
      const row = target.closest(".grid-cell").dataset.row;
      const col = target.closest(".grid-cell").dataset.col;

      // Speichere die Startposition und initialisiere das Dragging
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
