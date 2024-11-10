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
    this.set("pedestrianModels", this.generateModelList());

    // Modelle aus der generierten Liste abrufen und nach Kategorie aufteilen
    const models = this.generateCarModelList();
    this.setProperties({
      carModels: models.find((m) => m.category === "Car").items,
      truckModels: models.find((m) => m.category === "Truck").items,
      vanModels: models.find((m) => m.category === "Van").items,
      busModels: models.find((m) => m.category === "Bus").items,
      motorcycleModels: models.find((m) => m.category === "Motorcycle").items,
      bicycleModels: models.find((m) => m.category === "Bicycle").items,
    });

    // Debug-Ausgaben zur Überprüfung
    console.log("carModels", this.get("carModels"));
    console.log("truckModels", this.get("truckModels"));
    console.log("vanModels", this.get("vanModels"));
    console.log("busModels", this.get("busModels"));
    console.log("motorcycleModels", this.get("motorcycleModels"));
    console.log("bicycleModels", this.get("bicycleModels"));
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

  selectedPathObserver: function () {
    this.set("selectedPath", this.carjanState.selectedPath);
  }.observes("carjanState.selectedPath.color"),

  waypointsObserver: function () {
    this.waypoints = this.carjanState.get("waypoints");
    this.displayWaypointsInCell();
  }.observes("carjanState.waypoints"),

  positionObserver: function () {
    let position = this.carjanState.get("currentCellPosition");

    this.set("cellPosition", [position[0], position[1]]);
    this.displayWaypointsInCell();
  }.observes("carjanState.currentCellPosition"),

  generateModelList() {
    const models = [];
    for (let i = 1; i < 50; i++) {
      const id = i.toString().padStart(4, "0");
      models.push({
        id,
        name: `pedestrian_${id}`,
        imageUrl: `https://carla.readthedocs.io/en/0.9.15/img/catalogue/pedestrians/pedestrian_${id}.webp`,
      });
    }
    return models;
  },

  generateCarModelList() {
    const models = [
      {
        category: "Car",
        items: [
          {
            name: "Audi - A2",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/audi_a2.webp",
          },
          {
            name: "Audi - E-Tron",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/audi_etron.webp",
          },
          {
            name: "Audi - TT",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/audi_tt.webp",
          },
          {
            name: "BMW - Gran Tourer",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/bmw_grantourer.webp",
          },
          {
            name: "Chevrolet - Impala",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/chevrolet_impala.webp",
          },
          {
            name: "Citroen - C3",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/citroen_c3.webp",
          },
          {
            name: "Dodge - Charger 2020",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/dodge_charger_2020.webp",
          },
          {
            name: "Dodge - Police Charger 2020",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/dodge_charger_police_2020.webp",
          },
          {
            name: "Dodge - Police Charger",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/dodge_charger_police_2020.webp",
          },
          {
            name: "Ford - Crown (taxi)",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/ford_crown.webp",
          },
          {
            name: "Ford - Mustang",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/ford_mustang.webp",
          },
          {
            name: "Jeep - Wrangler Rubicon",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/jeep_wrangler_rubicon.webp",
          },
          {
            name: "Lincoln - MKZ 2017",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/lincoln_mkz_2017.webp",
          },
          {
            name: "Lincoln - MKZ 2020",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/lincoln_mkz_2020.webp",
          },
          {
            name: "Mercedes - Coupe 2020",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/mercedes_coupe_2020.webp",
          },
          {
            name: "Mercedes - Coupe",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/mercedes_coupe.webp",
          },
          {
            name: "Micro - Microlino",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/micro_microlino.webp",
          },
          {
            name: "Mini - Cooper S",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/mini_cooper_s.webp",
          },
          {
            name: "Mini - Cooper S 2021",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/mini_cooper_s_2021.webp",
          },
          {
            name: "Nissan - Micra",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/nissan_micra.webp",
          },
          {
            name: "Nissan - Patrol",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/nissan_patrol.webp",
          },
          {
            name: "Nissan - Patrol 2021",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/nissan_patrol_2021.webp",
          },
          {
            name: "Seat - Leon",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/seat_leon.webp",
          },
          {
            name: "Toyota - Prius",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/toyota_prius.webp",
          },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      },
      {
        category: "Truck",
        items: [
          {
            name: "CARLA Motors - CarlaCola",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/carlamotors_carlacola.webp",
          },
          {
            name: "CARLA Motors - European HGV",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/carlamotors_european_hgv.webp",
          },
          {
            name: "CARLA Motors - Firetruck",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/carlamotors_firetruck.webp",
          },
          {
            name: "Tesla - Cybertruck",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/tesla_cybertruck.webp",
          },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      },
      {
        category: "Van",
        items: [
          {
            name: "Ford - Ambulance",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/ford_ambulance.webp",
          },
          {
            name: "Mercedes - Sprinter",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/mercedes_sprinter.webp",
          },
          {
            name: "Volkswagen - T2",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/volkswagen_t2.webp",
          },
          {
            name: "Volkswagen - T2 2021",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/volkswagen_t2_2021.webp",
          },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      },
      {
        category: "Bus",
        items: [
          {
            name: "Mitsubishi - Fusorosa",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/mitsubishi_fusorosa.webp",
          },
        ],
      },
      {
        category: "Motorcycle",
        items: [
          {
            name: "Harley Davidson - Low Rider",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/harley-davidson_low_rider.webp",
          },
          {
            name: "Kawasaki - Ninja",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/kawasaki_ninja.webp",
          },
          {
            name: "Vespa - ZX 125",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/vespa_zx125.webp",
          },
          {
            name: "Yamaha - YZF",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/yamaha_yzf.webp",
          },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      },
      {
        category: "Bicycle",
        items: [
          {
            name: "BH - Crossbike",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/bh_crossbike.webp",
          },
          {
            name: "Diamondback - Century",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/diamondback_century.webp",
          },
          {
            name: "Gazelle - Omafiets",
            imageUrl:
              "https://carla.readthedocs.io/en/0.9.15/img/catalogue/vehicles/gazelle_omafiets.webp",
          },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      },
    ];

    return models;
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

  actions: {
    selectModel(model) {
      this.set("selectedModel", model);
    },

    inputFocusIn() {
      if (this.changeOriginalFlag) {
        this.original = this.selectedPath.description;
      }
      this.changeOriginalFlag = false;
    },
    checkPathDescription() {
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

        return isSameDescription && trimmedDescription !== this.original.trim();
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
    },

    inputFocusOut() {
      if (!this.hasError) {
        let allPaths = this.carjanState.paths;

        let updatedPaths = allPaths.map((path) =>
          path.path === this.selectedPath.path ? this.selectedPath : path
        );

        this.carjanState.set("paths", updatedPaths);
      }
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
