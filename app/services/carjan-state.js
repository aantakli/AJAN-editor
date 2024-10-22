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
});
