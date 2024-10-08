import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { set, observer } from "@ember/object";
import { run } from "@ember/runloop";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdf from "npm:rdf-ext";

export default Component.extend({
  rs: getComputedStyle(document.documentElement),
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
  colors: {
    road: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim(),
    path: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary-2")
      .trim(),
  },
  didInsertElement() {
    this._super(...arguments);
    rdfGraph.set(rdf.dataset());
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
      const map = this.carjanState.mapData;
      const agents = this.carjanState.agentData;
      if (map && agents) {
        this.deleteAllEntites();
        this.setupGrid(map, agents);
      }
    }
  ),

  saveObserver: observer("carjanState.isSaveRequest", function () {
    if (this.carjanState.isSaveRequest) {
      this.saveEditorToRepo();
    }
  }),

  deleteAllEntites() {
    this.gridCells.forEach((cell) => {
      const row = cell.row;
      const col = cell.col;
      this.removeEntityFromGrid(row, col);
    });
  },

  saveEditorToRepo() {
    const rdfGraph = rdf.dataset();

    const gridContainer = this.element.querySelector("#gridContainer");
    if (!gridContainer) {
      console.error("GridContainer not found");
      return;
    }

    const scenarioURI = rdf.namedNode(
      "http://example.com/carla-scenario#CurrentScenario"
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
          rdf.namedNode(`http://example.com/carla-scenario#${currentMap}`)
        )
      );
    }

    const cells = gridContainer.querySelectorAll(".grid-cell");
    let entityCounter = 1;

    cells.forEach((cell) => {
      const row = cell.dataset.row;
      const col = cell.dataset.col;

      const isOccupied = cell.getAttribute("data-occupied") === "true";
      const entityType = this.gridStatus[`${row},${col}`].entityType;

      if (isOccupied) {
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

        if (entityTypeURI) {
          rdfGraph.add(
            rdf.quad(
              entityURI,
              rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
              entityTypeURI
            )
          );
        }

        // Füge die Position (SpawnPoint) hinzu
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

        entityCounter++;
      }
    });

    this.carjanState.setUpdateStatements(rdfGraph);
  },

  setupGrid(map = null, agents = null) {
    let cells = [];
    let status = {};
    let colors = [];

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        let color = this.colors.road;

        if (map && map[row] && map[row][col]) {
          const cellType = map[row][col];
          if (cellType === "r") {
            color = this.colors.road;
          } else if (cellType === "p") {
            color = this.colors.path;
          }
        }

        colors[`${row},${col}`] = color;

        status[`${row},${col}`] = {
          occupied: false,
          entityType: null,
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
            gridElement.style.backgroundColor = colors[`${row},${col}`];
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

        gridElement.setAttribute("data-occupied", "true");
        gridElement.setAttribute("data-entityType", "true");
        gridElement.setAttribute("draggable", "true");

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
      if (isEntityCell) {
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
