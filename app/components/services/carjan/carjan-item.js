import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { set, observer } from "@ember/object";
import { run } from "@ember/runloop";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdf from "npm:rdf-ext";

export default Component.extend({
  attributeBindings: ["style"],
  style: "height: 100%;",
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
  drag: {
    state: false,
    x: 0,
    y: 0,
  },
  dragFlag: false,
  mapData: null,
  agentData: null,
  colors: {
    road: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim(),
    path: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary-2")
      .trim(),
    void: "#333333",
  },
  currentWaypoints: [],

  didInsertElement() {
    this._super(...arguments);
    rdfGraph.set(rdf.dataset());
    this.draggingEntityType = null;
    this.setupPanningAndZoom();
    this.applyTransform();

    if (this.carjanState.mapData && this.carjanState.agentData) {
      this.setupGrid(this.carjanState.mapData, this.carjanState.agentData);
    }
  },
  actions: {
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
        if (!this.dragFlag) {
          return;
        }
        this.recoverEntity();
        this.dragFlag = false;

        return;
      }

      const entityType = this.draggingEntityType
        ? this.draggingEntityType
        : event.dataTransfer.getData("text");
      this.draggingEntityType = null;

      if (row && col) {
        if (entityType === "waypoint") {
          this.addSingleWaypoint(row, col, "top-left");
        } else {
          this.addEntityToGrid(entityType, row, col);
        }
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
    function () {
      const currentMap = this.carjanState.mapData;
      const currentAgents = this.carjanState.agentData;

      if (
        this.previousMap !== currentMap ||
        this.previousAgents !== currentAgents
      ) {
        console.log("Data changed and deleting waypoints");
        this.deleteAllEntites();
        this.setupGrid(currentMap, currentAgents);
        this.previousMap = currentMap;
        this.previousAgents = currentAgents;
      }
    }
  ),

  saveObserver: observer("carjanState.isSaveRequest", function () {
    if (this.carjanState.isSaveRequest) {
      this.saveEditorToRepo();
    }
  }),

  cameraPositionObserver: observer("carjanState.cameraPosition", function () {
    this.updateCameraPosition();
  }),

  deleteAllEntites() {
    if (this.gridCells) {
      this.gridCells.forEach((cell) => {
        const row = cell.row;
        const col = cell.col;
        if (this.gridStatus[`${row},${col}`].entityType !== "void") {
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

    // Szenario-Daten hinzufügen
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

    const weather = this.carjanState.get("weather") || "Clear";
    const category = this.carjanState.get("category") || "Urban";
    const cameraPosition = this.carjanState.get("cameraPosition") || "up";

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

      // Entitäten speichern, wenn sie existieren
      if (cellStatus.occupied && cellStatus.entityType !== "void") {
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

    waypoints.forEach((waypoint) => {
      const positionIndex = this.getPositionIndex(waypoint.positionInCell);

      const waypointId = `Waypoint${String(waypoint.x).padStart(
        2,
        "0"
      )}${String(waypoint.y).padStart(2, "0")}_${positionIndex}`;
      const waypointURI = rdf.namedNode(
        `http://example.com/carla-scenario#${waypointId}`
      );

      // Füge den Waypoint zum Szenario hinzu
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          rdf.namedNode("http://example.com/carla-scenario#hasWaypoints"),
          waypointURI
        )
      );

      // Typ und Position des Waypoints hinzufügen
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

    // Pfade hinzufügen
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
            const nextPositionIndex = this.getPositionIndex(
              path.waypoints[idx + 1].positionInCell
            );
            const nextListNode = rdf.namedNode(
              `http://example.com/carla-scenario#PathListNode${nextPositionIndex}`
            );
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
  },

  setupGrid(map = null, agents = null) {
    if (!map || !agents) {
      return;
    }
    let cells = [];
    let status = {};
    let colors = [];

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        let color = this.colors.void;

        if (map && map[row] && map[row][col]) {
          const cellType = map[row][col];
          if (cellType === "r") {
            color = this.colors.road;
          } else if (cellType === "p") {
            color = this.colors.path;
          }
        }

        if (color === this.colors.void) {
          status[`${row},${col}`] = {
            occupied: true,
            entityType: "void",
          };
        } else {
          status[`${row},${col}`] = {
            occupied: false,
            entityType: null,
          };
        }

        colors[`${row},${col}`] = color;
        cells.push({ row, col });
      }
    }

    this.gridStatus = status;

    run.scheduleOnce("afterRender", this, function () {
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
          }
        }
      }
    });
    if (agents) {
      agents.forEach((agent) => {
        this.addEntityToGrid(agent.type, agent.x, agent.y);
      });
    }
    this.addWaypointsToGrid();
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
    }

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
  },

  async addSingleWaypoint(row, col, positionInCell) {
    run.scheduleOnce("afterRender", this, function () {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );

      if (gridElement) {
        // Initialisiere den Status der Zelle, falls nicht vorhanden
        let cellStatus = this.gridStatus[`${row},${col}`] || { waypoints: [] };
        if (cellStatus.occupied && cellStatus.entityType === "void") {
          console.log(`Cannot place waypoint on void cell at (${row}, ${col})`);
          return;
        }

        if (!cellStatus.waypoints) {
          cellStatus.waypoints = [];
        } else {
          // falls es schon einen waypoint mit gleicher positionInCell gibt, berechne den Index der positionInCell
          const existingWaypoint = cellStatus.waypoints.find(
            (waypoint) => waypoint.positionInCell === positionInCell
          );

          if (existingWaypoint) {
            if (cellStatus.waypoints.length < 9) {
              let index = this.getPositionIndex(positionInCell);
              index = (index + 1) % 9;
              this.addSingleWaypoint(row, col, this.getPositionByIndex(index));
              return;
            }
            return;
          }
        }

        // Erstelle das Waypoint-Icon
        const waypointIcon = document.createElement("i");
        waypointIcon.classList.add("icon", "map", "marker", "alternate");
        waypointIcon.style.fontSize = "12px";
        waypointIcon.style.position = "absolute";
        waypointIcon.style.pointerEvents = "none";

        // Berechne den Offset basierend auf `positionInCell`
        const cellSize = gridElement.offsetWidth || 36;
        const positionIndex = this.getPositionIndex(positionInCell);
        const [offsetX, offsetY] = this.getOffsetForPositionIndex(
          positionIndex,
          cellSize
        );

        waypointIcon.style.left = `${offsetX}px`;
        waypointIcon.style.top = `${offsetY}px`;

        // Füge das Waypoint-Icon zur Zelle hinzu
        gridElement.appendChild(waypointIcon);

        // Aktualisiere den Waypoint-Status in der Zelle
        cellStatus.waypoints.push({
          type: "waypoint",
          positionInCell: positionInCell,
        });
        // Speichere den aktualisierten Status in der gridStatus-Map
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
      // remove this.gridStatus.[i].waypoints
      for (let row = 0; row < this.gridRows; row++) {
        for (let col = 0; col < this.gridCols; col++) {
          let cellStatus = this.gridStatus[`${row},${col}`];
          if (cellStatus && cellStatus.waypoints) {
            console.log("cellStatus", cellStatus);

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
      [0, 0], // top-left
      [cellWidth / 2, 0], // top-center
      [cellWidth - 2, 0], // top-right
      [0, cellHeight / 2 - 2], // middle-left
      [cellWidth / 2, cellHeight / 2 - 2], // center
      [cellWidth - 2, cellHeight / 2 - 2], // middle-right
      [0, cellHeight - 5], // bottom-left
      [cellWidth / 2, cellHeight - 5], // bottom-center
      [cellWidth - 2, cellHeight - 5], // bottom-right
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

        // Für andere Entitäten
        if (cellStatus.occupied && cellStatus.entityType === "void") {
          console.log(`Cannot place entity on void cell at (${row}, ${col})`);
          return;
        }

        const iconMap = {
          Pedestrian: "user",
          pedestrian: "user",
          Vehicle: "car",
          vehicle: "car",
          autonomous: "taxi",
          obstacle: "tree",
          default: "map marker alternate",
        };

        const iconClass = iconMap[entityType] || iconMap.default;

        // Lösche vorheriges Icon und füge das neue Entität-Icon hinzu
        gridElement.innerHTML = "";
        const iconElement = document.createElement("i");
        iconElement.classList.add("icon", iconClass);
        iconElement.style.fontSize = "24px";
        iconElement.style.display = "flex";
        iconElement.style.alignItems = "center";
        iconElement.style.justifyContent = "center";
        iconElement.style.height = "100%";
        iconElement.style.width = "100%";
        iconElement.style.pointerEvents = "none";

        gridElement.appendChild(iconElement);

        gridElement.setAttribute("data-occupied", "true");
        gridElement.setAttribute("data-entityType", entityType);
        gridElement.setAttribute("draggable", "true");

        // Aktualisiere Status für reguläre Entitäten
        this.gridStatus[`${row},${col}`] = {
          occupied: true,
          entityType: entityType,
          waypoints: cellStatus.waypoints || [],
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
        gridElement.innerHTML = "";
        gridElement.removeAttribute("data-occupied");
        gridElement.setAttribute("data-entityType", "false");
        gridElement.removeAttribute("draggable");

        this.gridStatus[`${row},${col}`] = {
          occupied: false,
          entityType: null,
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
    const [originalRow, originalCol] = this.draggingEntityPosition;
    this.addEntityToGrid(this.draggingEntityType, originalRow, originalCol);
    this.draggingEntityType = null;
  },

  applyTransform() {
    const gridContainer = this.element.querySelector("#gridContainer");
    const cameraIcon = this.element.querySelector(".camera-icon");

    gridContainer.style.transform = `translate3d(${this.get(
      "translateX"
    )}px, ${this.get("translateY")}px, 0) scale(${this.get("scale")})`;
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

    if (cellStatus && cellStatus.waypoints && cellStatus.waypoints.length > 0) {
      this.carjanState.set("currentCellStatus", cellStatus);
      this.carjanState.set("currentCellPosition", [row, col]);
      this.carjanState.set("openWaypointEditor", true);
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
