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
  cellPosition: [],

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
    console.log("status und position", this.cellStatus, this.cellPosition);
    this.displayWaypointsInCell();
    return this.carjanState.openWaypointEditor;
  }),

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
    console.log("positionInCell: ", positionInCell);
    return positionMap[positionInCell] ? positionMap[positionInCell] : 0;
  },

  // Funktion zur Anzeige der Waypoints in den Zellen
  displayWaypointsInCell() {
    console.log("displayWaypointsInCell");

    let cells = this.gridCells;
    if (this.cellStatus === null) {
      return;
    }

    console.log("waypoints: ", this.cellStatus.waypoints);

    let waypoints = this.cellStatus.waypoints;
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

          // Nur wenn ein passender Waypoint gefunden wurde, Icon hinzufügen
          if (matchingWaypoint) {
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
            gridElement.appendChild(waypointIcon);
          }
        } else {
          console.warn(
            `Kein Element gefunden für Zelle: row=${row}, col=${col}`
          );
        }
      });
    });
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

  didRender() {
    this._super(...arguments);
    run.scheduleOnce("afterRender", this, function () {
      this.$(".ui.dropdown").dropdown({});
    });
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

    dropOnCell(event) {
      const row = event.target.dataset.row;
      const col = event.target.dataset.col;
      const cellStatus = this.carjanState.get("gridStatus")[`${row},${col}`];

      if (cellStatus && cellStatus.waypoints) {
        this.carjanState.set("openWaypointEditor", true);
      }
    },

    dropOnBackground() {
      return;
    },

    dragLeave(event) {
      return;
    },

    dragStart(event) {
      return;
    },

    allowDrop(event) {
      event.preventDefault();
    },
  },
});
