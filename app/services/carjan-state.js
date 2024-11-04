import Service from "@ember/service";
import { set } from "@ember/object";

export default Service.extend({
  mapData: null,
  agentData: null,
  mapName: null,
  availableScenarios: null,
  scenarioName: null,
  isSaveRequest: false,
  updateStatements: null,
  weather: "Clear",
  category: "Urban",
  cameraPosition: "up",
  paths: null,
  waypoints: null,
  openWaypointEditor: false,
  currentCellStatus: null,
  currentCellPosition: [],
  addPath: false,

  appendPath(path) {
    const paths = this.paths || [];
    paths.push(path);
    this.setPaths(paths);
  },

  setWaypointEditor(isOpen) {
    set(this, "openWaypointEditor", isOpen);
  },

  setMapName(mapName) {
    set(this, "mapName", mapName);
  },

  setMapData(map) {
    set(this, "mapData", map);
  },

  setAgentData(agents) {
    set(this, "agentData", agents);
  },

  setAvailableScenarios(scenarios) {
    this.set("availableScenarios", scenarios);
  },

  setScenarioName(name) {
    set(this, "scenarioName", name);
  },

  setWeather(weather) {
    set(this, "weather", weather);
  },

  setCategory(category) {
    set(this, "category", category);
  },

  setCameraPosition(cameraPosition) {
    set(this, "cameraPosition", cameraPosition);
  },

  saveRequest() {
    set(this, "isSaveRequest", true);
    setTimeout(() => {
      set(this, "isSaveRequest", false);
    }, 100);
  },

  setUpdateStatements(rdfgraph) {
    set(this, "updateStatements", rdfgraph);
  },

  setPaths(paths) {
    console.log("paths", paths);
    set(this, "paths", paths);
  },

  setWaypoints(waypoints) {
    console.log("waypoints", waypoints);
    set(this, "waypoints", waypoints);
  },

  setCurrentCellStatus(cellStatus) {
    set(this, "currentCellStatus", cellStatus);
  },

  setCurrentCellPosition(cellPosition) {
    set(this, "currentCellPosition", cellPosition);
  },

  setScenario(dataset) {
    console.log("dataset", dataset);
    const scenario = dataset.scenarios[0];
    if (scenario.scenarioName) {
      this.setScenarioName(scenario.scenarioName.split("#")[1]);
    }
    if (scenario.scenarioMap) {
      this.setMapName(scenario.scenarioMap);
    }
    if (scenario.weather) {
      this.setWeather(scenario.weather);
    }
    if (scenario.cameraPosition) {
      this.setCameraPosition(scenario.cameraPosition);
    }
    if (scenario.category) {
      this.setCategory(scenario.category);
    }
    if (scenario.entities) {
      this.setAgentData(scenario.entities);
    }

    if (scenario.paths) {
      this.setPaths(scenario.paths);
    }

    if (scenario.waypoints) {
      this.setWaypoints(scenario.waypoints);
    }
  },
});
