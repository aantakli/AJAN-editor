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

  // Die neue setScenario Funktion
  setScenario(dataset) {
    const scenario = dataset.scenarios[0]; // Nimm das erste Szenario aus dem Dataset

    // Setze die entsprechenden Werte basierend auf dem Szenario
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

    // Setze die Entitäten (agents) und Waypoints
    if (scenario.entities) {
      this.setAgentData(scenario.entities);
    }

    // Die Pfade (paths) und Wegpunkte (waypoints) können auch in anderen Methoden verarbeitet werden,
    // je nachdem wie du sie weiterverwenden möchtest.
    if (scenario.paths) {
      // Optional: Hier könntest du eine Funktion wie `setPaths` implementieren
      // this.setPaths(scenario.paths);
    }

    if (scenario.waypoints) {
      // Optional: Hier könntest du eine Funktion wie `setWaypoints` implementieren
      // this.setWaypoints(scenario.waypoints);
    }

    console.log("Scenario has been set in CarjanState", scenario);
  },
});
