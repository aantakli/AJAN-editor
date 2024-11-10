import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { set, observer, computed } from "@ember/object";
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
  chevrons: [],
  reloadFlag: true,

  didInsertElement() {
    this._super(...arguments);
    rdfGraph.set(rdf.dataset());
    this.draggingEntityType = null;
    this.setupPanningAndZoom();
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
        (this.previousMap !== currentMap ||
          this.previousAgents !== currentAgents) &&
        !this.reloadFlag
      ) {
        this.deleteAllEntites();
        this.setupGrid(currentMap, currentAgents);
        this.previousMap = currentMap;
        this.previousAgents = currentAgents;
      }
    }
  ),

  pathModeObserver: observer("carjanState.pathMode", function () {
    if (this.carjanState.pathMode) {
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
    this.setupGrid(this.carjanState.mapData, this.carjanState.agentData);
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
    this.drawMainPathLines();
  }),

  selectedPathColorObserver: observer(
    "carjanState.selectedPath.color",
    function () {
      this.drawMainPathLines();
    }
  ),

  pathInProgressObserver: observer("carjanState.pathInProgress", function () {
    if (this.carjanState.pathInProgress.waypoints.length === 0) {
      this.pathIcons = [];
    }
  }),

  drawMainPathLines() {
    if (this.carjanState.selectedPath && !this.carjanState.pathMode) {
      this.pathIcons = [];

      this.carjanState.selectedPath.waypoints.forEach((waypoint) => {
        const waypointElement = document.querySelector(
          `.grid-cell[data-row="${waypoint.x}"][data-col="${waypoint.y}"] .icon[data-position-in-cell="${waypoint.positionInCell}"]`
        );

        if (waypointElement) {
          this.pathIcons.push(waypointElement);
        }
      });
      this.drawPathLines();
    }
  },

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
            }
          }
        }
      });
    });
    if (agents && !this.carjanState.pathMode) {
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
        let cellStatus = this.gridStatus[`${row},${col}`] || { waypoints: [] };
        if (cellStatus.occupied && cellStatus.entityType === "void") {
          console.error(
            `Cannot place waypoint on void cell at (${row}, ${col})`
          );
          return;
        }

        if (!cellStatus.waypoints) {
          cellStatus.waypoints = [];
        } else {
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

        const waypointIcon = document.createElement("i");
        waypointIcon.classList.add("icon", "map", "marker", "alternate");
        waypointIcon.style.fontSize = "12px";
        waypointIcon.style.position = "absolute";
        waypointIcon.style.pointerEvents = "none";

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
          autonomous: "taxi",
          obstacle: "tree",
          default: "map marker alternate",
        };

        const iconClass = iconMap[entityType] || iconMap.default;

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

  drawPathLines() {
    const pathOverlay = document.getElementById(this.gridId);
    if (!pathOverlay) return;
    pathOverlay.innerHTML = "";

    const overlayRect = pathOverlay.getBoundingClientRect();
    const icons = this.pathIcons || [];
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

    const pathColor = this.carjanState.selectedPath.color || "#000";
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

    if (
      e.target.classList.contains("icon") &&
      e.target.classList.contains("map") &&
      e.target.classList.contains("marker") &&
      e.target.classList.contains("alternate") &&
      this.carjanState.pathMode
    ) {
      console.log("e.target", e.target);
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
      if (filteredWaypoints.length > 0) {
        this.carjanState.addWaypointToPathInProgress(filteredWaypoints[0]);
      }
      const pathColor = this.carjanState.selectedPath.color || "#000";

      e.target.style.transition =
        "transform 0.5s ease, color 0.2s ease, textshadow 0.2 ease";
      e.target.style.color = pathColor;
      e.target.style.transform = "scale(1.8)";
      e.target.style.textShadow = "0 0 3px black";

      this.pathIcons = this.pathIcons || [];
      this.pathIcons.push(e.target);

      this.drawPathLines();
      return;
    }

    const targetCell = e.target;
    const row = targetCell.dataset.row;
    const col = targetCell.dataset.col;

    const cellStatus = this.gridStatus[`${row},${col}`];
    console.log("cellStatus", cellStatus);
    if (cellStatus && cellStatus.waypoints && cellStatus.waypoints.length > 0) {
      this.carjanState.set("currentCellStatus", cellStatus);
      this.carjanState.set("currentCellPosition", [row, col]);
      this.carjanState.set("properties", "waypoint");
    }

    if (cellStatus) {
      if (cellStatus.entityType === "Pedestrian") {
        console.log("Pedestrian clicked", row, col);
        this.carjanState.set("currentCellStatus", cellStatus);
        this.carjanState.set("currentCellPosition", [row, col]);
        this.carjanState.set("properties", "pedestrian");
      } else if (cellStatus.entityType === "Vehicle") {
        console.log("Vehicle clicked", row, col);
        this.carjanState.set("currentCellStatus", cellStatus);
        this.carjanState.set("currentCellPosition", [row, col]);
        this.carjanState.set("properties", "vehicle");
      } else if (cellStatus.entityType === "autonomous") {
        console.log("Autonomous clicked", row, col);
      } else if (cellStatus.entityType === "obstacle") {
        console.log("Obstacle clicked", row, col);
      } else {
        console.log("Unknown entity clicked", cellStatus);
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
        console.log("isEntityCell", isEntityCell);
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
