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
    //mittel aber dunkles grau für void
    void: "#333333",
  },
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

  deleteAllEntites() {
    if (this.gridCells) {
      this.gridCells.forEach((cell) => {
        const row = cell.row;
        const col = cell.col;
        this.removeEntityFromGrid(row, col);
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
    console.log("Selected value: ", name);
    const scenarioName = name ? name : "CurrentScenario";
    const scenarioURI = rdf.namedNode(
      `http://example.com/carla-scenario#${scenarioName}`
    );

    // Füge das Szenario in den RDF-Graphen ein
    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        rdf.namedNode("http://example.com/carla-scenario#Scenario")
      )
    );

    // Füge die Map zum Szenario hinzu
    const currentMap = this.carjanState.get("mapName");
    if (currentMap) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          rdf.namedNode("http://example.com/carla-scenario#hasMap"),
          rdf.literal(currentMap)
        )
      );
    }

    const weather = "Clear";
    const category = "Urban";
    const cameraPosition = "up";

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

      const isOccupied = cell.getAttribute("data-occupied") === "true";
      const entityType = this.gridStatus[`${row},${col}`].entityType;

      if (isOccupied && entityType !== "void") {
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

        this.addEntityToGraph(rdfGraph, entityURI, entityType, row, col);
      }
    });

    this.carjanState.setUpdateStatements(rdfGraph);

    this.carjanState.set("isSaveRequest", false);
    console.log("Scenario successfully saved to the repository.");
  },

  addEntityToGraph(rdfGraph, entityURI, entityType, row, col) {
    let entityTypeURI;

    if (entityType === "pedestrian") {
      entityTypeURI = rdf.namedNode(
        "http://example.com/carla-scenario#Pedestrian"
      );
    } else if (entityType === "vehicle") {
      entityTypeURI = rdf.namedNode(
        "http://example.com/carla-scenario#Vehicle"
      );
    } else if (entityType === "autonomous") {
      entityTypeURI = rdf.namedNode(
        "http://example.com/carla-scenario#AutonomousVehicle"
      );
    } else {
      entityTypeURI = rdf.namedNode(
        "http://example.com/carla-scenario#Obstacle"
      );
    }

    rdfGraph.add(
      rdf.quad(
        entityURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        entityTypeURI
      )
    );

    rdfGraph.add(
      rdf.quad(
        entityURI,
        rdf.namedNode("http://example.com/carla-scenario#spawnPointX"),
        rdf.literal(
          col,
          rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
        )
      )
    );

    rdfGraph.add(
      rdf.quad(
        entityURI,
        rdf.namedNode("http://example.com/carla-scenario#spawnPointY"),
        rdf.literal(
          row,
          rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
        )
      )
    );
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
        let color = this.colors.void; // Standardfarbe Void

        if (map && map[row] && map[row][col]) {
          const cellType = map[row][col];
          if (cellType === "r") {
            color = this.colors.road;
          } else if (cellType === "p") {
            color = this.colors.path;
          }
        }

        colors[`${row},${col}`] = color;

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
    // Entities hinzufügen, falls vorhanden
    if (agents) {
      agents.forEach((agent) => {
        this.addEntityToGrid(agent.type, agent.y, agent.x);
      });
    }
    /*
    const existingCameraIcon = this.element.querySelector(".camera-icon");
    if (existingCameraIcon) {
      existingCameraIcon.remove();
    }

    const cameraIcon = document.createElement("i");
    cameraIcon.classList.add("camera-icon", "video", "icon");
    cameraIcon.style.position = "absolute";
    cameraIcon.style.fontSize = "36px";

    const positions = {
      up: {
        top: `${gridRect.top - 50}px`,
        left: `${gridRect.left + gridRect.width / 2 - 18}px`,
        rotate: "180deg",
      },
      down: {
        top: `${gridRect.bottom + 10}px`,
        left: `${gridRect.left + gridRect.width / 2 - 18}px`,
        rotate: "0deg",
      },
      left: {
        top: `${gridRect.top + gridRect.height / 2 - 18}px`,
        left: `${gridRect.left - 50}px`,
        rotate: "90deg",
      },
      right: {
        top: `${gridRect.top + gridRect.height / 2 - 18}px`,
        left: `${gridRect.right + 10}px`,
        rotate: "-90deg",
      },
    };

    const cameraPosition = this.carjanState.get("cameraPosition") || "up";
    const { top, left, rotate } = positions[cameraPosition];

    cameraIcon.style.top = top;
    cameraIcon.style.left = left;
    cameraIcon.style.transform = `rotate(${rotate})`;

    this.element.appendChild(cameraIcon); */

    set(this, "gridCells", cells);
    set(this, "gridStatus", status);
  },

  addEntityToGrid(entityType, row, col) {
    run.scheduleOnce("afterRender", this, function () {
      const gridElement = this.element.querySelector(
        `.grid-cell[data-row="${row}"][data-col="${col}"]`
      );
      if (gridElement) {
        const currentStatus = this.gridStatus[`${row},${col}`];

        // Verhindere, dass auf Void-Zellen Entities gesetzt werden
        if (currentStatus.occupied && currentStatus.entityType === "void") {
          console.log(`Cannot place entity on void cell at (${row}, ${col})`);
          return;
        }

        // Setze das Icon für die Entität
        const iconMap = {
          pedestrian: "user",
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

        // Aktualisiere den Grid-Status
        gridElement.setAttribute("data-occupied", "true");
        gridElement.setAttribute("data-entityType", entityType);
        gridElement.setAttribute("draggable", "true");

        // Der Status für nicht-void Zellen wird aktualisiert
        this.gridStatus[`${row},${col}`] = {
          occupied: true,
          entityType: entityType,
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
    //this.applyTransformToCameraIcon(cameraIcon);
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
