import $ from "jquery";
import actions from "ajan-editor/helpers/carjan/actions";
import Component from "@ember/component";
import N3Parser from "npm:rdf-parser-n3";
import { computed, set, observer } from "@ember/object";
import { next } from "@ember/runloop";
import { inject as service } from "@ember/service";
import rdf from "npm:rdf-ext";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import stringToStream from "npm:string-to-stream";

const prefixes = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  carjan: "http://example.com/carla-scenario#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

export default Component.extend({
  dataBus: service("data-bus"),
  ajax: service(),
  store: service(),
  carjanState: service(),
  isDialogOpen: false,
  isDeleteDialogOpen: false,
  isSwitchScenarioDialogOpen: false,
  isMachineModalOpen: false,
  isGithubModalOpen: false,
  isRenameModalOpen: false,
  scenarioName: "",
  hasError: false,
  isNameEmpty: true,
  loading: true,
  updating: false,
  githubRepoUsername: "",
  githubRepoRepository: "",
  githubToken: "",
  oldScenarioName: "",
  hideToken: true,
  isDisabled: computed("hasError", "isNameEmpty", function () {
    return this.hasError || this.isNameEmpty;
  }),
  availableScenarios: null,
  selectedScenario: null,

  async init() {
    this._super(...arguments);

    const selectedValue = await this.getEnvironmentData("SELECTED_SCENARIO");
    this.set("selectedValue", selectedValue);

    rdfGraph.set(rdf.dataset());
    if (this.mode !== "fileSelection") {
      this.loadGrid();
      await this.stopFlask();
      const existingRepositoryContent = await this.downloadRepository();
      const existingDataset = await this.parseTrig(existingRepositoryContent);
      const scenarios = existingDataset.scenarios || [];
      this.set("availableScenarios", scenarios);
    }
  },

  uploadObserver: observer(
    "carjanState.uploadScenarioToCarla",
    async function () {
      if (
        this.carjanState.uploadScenarioToCarla === true &&
        this.mode !== "fileSelection"
      ) {
        try {
          this.set("step3Status", "loading");
          const trigContent = await this.downloadScenarioAsTrig(
            this.carjanState.scenarioName,
            true,
            false
          );

          if (!trigContent) {
            throw new Error("Failed to download trig content.");
          }
          // parse trig content to scenarios
          const scenario = await this.parseTrig(trigContent);

          const response = await fetch(
            "http://localhost:4204/api/carla-scenario",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                scenarioName: this.carjanState.scenarioName,
                scenario: scenario,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          const result = await response.json();

          this.set("step3Status", "completed");
          this.carjanState.setStep3Status("completed");
          this.carjanState.setUploadScenarioToCarla(false);
        } catch (error) {
          this.set("step3Status", "error");
          console.error("Failed to upload scenario to Carla:", error);
        }
      }
    }
  ),

  updateObserver: observer("carjanState.updateStatements", async function () {
    try {
      const statements = this.carjanState.updateStatements._quads;
      // print as string
      const parsedStatements =
        (await this.parseQuadsToScenarios(statements)) || [];
      console.log("parsedStatements", parsedStatements);
      const existingRepositoryContent = await this.downloadRepository();
      const existingDataset = await this.parseTrig(existingRepositoryContent);

      existingDataset.scenarios = existingDataset.scenarios || [];

      const newScenarioNames = parsedStatements.map(
        (scenario) => scenario.scenarioName
      );

      existingDataset.scenarios = existingDataset.scenarios.filter(
        (existingScenario) =>
          !newScenarioNames.includes(existingScenario.scenarioName)
      );

      existingDataset.scenarios.push(...parsedStatements);

      if (!this.updating) {
        this.updating = true;
        this.updateWithResult(existingDataset);
      }
    } catch (error) {
      console.error("Error in updateObserver:", error);
    }
  }),

  scenarioNameObserver: observer("carjanState.scenarioName", function () {
    this.set("scenarioName", this.carjanState.scenarioName);
  }),

  async stopFlask() {
    try {
      await fetch("http://localhost:4204/api/shutdownFlask", {
        method: "GET",
      });
    } catch (error) {
      console.error("Failed to stop Flask service:", error);
    }
  },

  async pingFlask() {
    try {
      const response = await fetch("http://localhost:4204/api/health_check", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.status === 200 && data.status === "Flask is ready") {
        return true;
      } else {
        console.warn(
          "Flask connection issue:",
          data.flaskError || "Unknown error"
        );
        return false;
      }
    } catch (error) {
      console.error("Error fetching ping flask data:", error);
      return false;
    }
  },

  async getEnvironmentData(envType) {
    try {
      const response = await fetch(
        "http://localhost:4204/api/get_environment_variable",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type: envType }),
        }
      );

      if (!response.ok) {
        throw new Error("Error fetching environment data");
      }

      const data = await response.json();
      return data.selectedValue;
    } catch (error) {
      console.error("Error fetching environment data:", error);
      return null;
    }
  },

  async parseQuadsToScenarios(quads) {
    try {
      const scenarios = [];
      let currentScenario = null;

      const entitiesMap = {};
      const waypointsMap = {};
      const pathsMap = {};
      const dboxesMap = {};

      quads.forEach((quad) => {
        const subject = quad.subject.value;
        const predicate = quad.predicate.value;
        const object = quad.object.value;

        // Szenario-Erkennung
        if (
          predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
          object === "http://example.com/carla-scenario#Scenario"
        ) {
          if (currentScenario) {
            scenarios.push(currentScenario);
          }

          currentScenario = {
            scenarioName: subject,
            scenarioMap: "map01",
            entities: [],
            waypoints: [],
            paths: [],
            dboxes: [],
            cameraPosition: null,
            label: "",
            category: "",
            weather: "",
            showGrid: "",
            showPaths: "",
            loadLayers: "",
          };
        }

        // Szenario-Eigenschaften hinzufügen
        if (currentScenario && subject === currentScenario.scenarioName) {
          if (predicate === "http://example.com/carla-scenario#label") {
            currentScenario.label = object.replace(/^"|"$/g, "");
          }

          if (predicate === "http://example.com/carla-scenario#category") {
            currentScenario.category = object.split("#")[1];
          }

          if (predicate === "http://example.com/carla-scenario#map") {
            currentScenario.scenarioMap = object.replace(/^"|"$/g, "");
          }

          if (predicate === "http://example.com/carla-scenario#weather") {
            currentScenario.weather = object.replace(/^"|"$/g, "");
          }

          if (predicate === "http://example.com/carla-scenario#showGrid") {
            currentScenario.showGrid = object;
          }

          if (predicate === "http://example.com/carla-scenario#showPaths") {
            currentScenario.showPaths = object;
          }

          if (predicate === "http://example.com/carla-scenario#loadLayers") {
            currentScenario.loadLayers = object;
          }

          if (
            predicate === "http://example.com/carla-scenario#cameraPosition"
          ) {
            currentScenario.cameraPosition = object.replace(/^"|"$/g, "");
          }

          // Entitäten dem Szenario hinzufügen
          if (predicate === "http://example.com/carla-scenario#hasEntity") {
            const entityURI = object;
            if (!currentScenario.entities.includes(entityURI)) {
              currentScenario.entities.push(entityURI);
            }
          }

          // Pfade dem Szenario hinzufügen
          if (predicate === "http://example.com/carla-scenario#hasPath") {
            const pathURI = object;
            if (!currentScenario.paths.includes(pathURI)) {
              currentScenario.paths.push(pathURI);
            }
          }

          // Direktzuweisung von Waypoints zum Szenario
          if (predicate === "http://example.com/carla-scenario#hasWaypoints") {
            const waypointURI = object;
            if (!currentScenario.waypoints.includes(waypointURI)) {
              currentScenario.waypoints.push(waypointURI);
            }
          }

          // DecisionBoxes dem Szenario hinzufügen
          if (
            predicate === "http://example.com/carla-scenario#hasDecisionBoxes"
          ) {
            const dboxURI = object;
            if (!currentScenario.dboxes.includes(dboxURI)) {
              currentScenario.dboxes.push(dboxURI);
            }
          }
        }

        // Entitäten erfassen
        if (
          predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
          (object === "http://example.com/carla-scenario#Vehicle" ||
            object === "http://example.com/carla-scenario#Pedestrian" ||
            object === "http://example.com/carla-scenario#Autonomous" ||
            object === "http://example.com/carla-scenario#Obstacle")
        ) {
          let entityType = object.split("#")[1];
          let modelType = null;
          switch (entityType) {
            case "Vehicle":
              modelType = "Audi - A2";
              break;
            case "Pedestrian":
              modelType = "pedestrian_0001";
              break;
            case "Autonomous":
              modelType = "Tesla - Model 3";
              break;
            case "Obstacle":
              modelType = "Street Barrier";
              break;
            default:
              modelType = "Audi - A2";
              break;
          }
          entitiesMap[subject] = {
            entity: subject,
            type: entityType,
            label: undefined,
            x: undefined,
            y: undefined,
            heading: "North",
            followsPath: null,
            fallbackPath: null,
            model: modelType,
            color: null,
            behavior: null,
            decisionBox: null,
          };
        }

        // Eigenschaften von Entitäten hinzufügen
        if (entitiesMap[subject]) {
          if (predicate === "http://example.com/carla-scenario#label") {
            entitiesMap[subject].label = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#x") {
            entitiesMap[subject].x = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#y") {
            entitiesMap[subject].y = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#heading") {
            entitiesMap[subject].heading = object;
          }
          if (predicate === "http://example.com/carla-scenario#followsPath") {
            entitiesMap[subject].followsPath = object;
          }
          if (predicate === "http://example.com/carla-scenario#fallbackPath") {
            entitiesMap[subject].fallbackPath = object;
          }
          if (predicate === "http://example.com/carla-scenario#model") {
            entitiesMap[subject].model = object;
          }
          if (predicate === "http://example.com/carla-scenario#color") {
            entitiesMap[subject].color = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#behavior") {
            entitiesMap[subject].behavior = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#decisionBox") {
            entitiesMap[subject].decisionBox = object.replace(/^"|"$/g, "");
          }
        }

        // Waypoints erfassen
        if (
          predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
          object === "http://example.com/carla-scenario#Waypoint"
        ) {
          waypointsMap[subject] = {
            waypoint: subject,
            x: null,
            y: null,
            waitTime: 0,
            positionInCell: "center",
          };
        }

        if (waypointsMap[subject]) {
          if (predicate === "http://example.com/carla-scenario#x") {
            waypointsMap[subject].x = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#y") {
            waypointsMap[subject].y = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#waitTime") {
            waypointsMap[subject].waitTime = object.replace(/^"|"$/g, "");
          }
          if (
            predicate === "http://example.com/carla-scenario#positionInCell"
          ) {
            waypointsMap[subject].positionInCell = object.replace(/^"|"$/g, "");
          }
        }

        // Paths erfassen
        if (
          predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
          object === "http://example.com/carla-scenario#Path"
        ) {
          pathsMap[subject] = {
            path: subject,
            waypoints: [],
            description: "",
            color: "#000000",
          };
        }

        if (
          pathsMap[subject] &&
          predicate === "http://example.com/carla-scenario#description"
        ) {
          pathsMap[subject].description = object.replace(/^"|"$/g, "");
        }

        if (
          pathsMap[subject] &&
          predicate === "http://example.com/carla-scenario#color"
        ) {
          pathsMap[subject].color = object.replace(/^"|"$/g, "");
        }

        // DecisionBoxes erfassen
        if (
          predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
          object === "http://example.com/carla-scenario#DecisionBox"
        ) {
          dboxesMap[subject] = {
            id: subject,
            label: "",
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            color: "#ff0000",
          };
        }

        // DecisionBox-Eigenschaften hinzufügen
        if (dboxesMap[subject]) {
          if (predicate === "http://example.com/carla-scenario#id") {
            dboxesMap[subject].id = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#label") {
            dboxesMap[subject].label = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#startX") {
            dboxesMap[subject].startX = String(object).replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#startY") {
            dboxesMap[subject].startY = String(object).replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#endX") {
            dboxesMap[subject].endX = String(object).replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#endY") {
            dboxesMap[subject].endY = String(object).replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#color") {
            dboxesMap[subject].color = object.replace(/^"|"$/g, "");
          }
        }
      });

      // für jede entität: wenn noch kein label dann einfach EntityXXYY
      Object.keys(entitiesMap).forEach((entityURI) => {
        const entity = entitiesMap[entityURI];
        if (!entity.label) {
          entity.label = entityURI.split("#")[1];
        }
      });

      quads.forEach((quad) => {
        const subject = quad.subject.value;
        const predicate = quad.predicate.value;
        const object = quad.object.value;

        // Erfassung von RDF-Listen für Waypoints in Paths
        if (
          pathsMap[subject] &&
          predicate === "http://example.com/carla-scenario#hasWaypoints"
        ) {
          const waypointsInPath = [];
          let currentListNode = object;

          while (
            currentListNode !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
          ) {
            quads.forEach((quadItem) => {
              if (quadItem.subject.value === currentListNode) {
                if (
                  quadItem.predicate.value ===
                  "http://www.w3.org/1999/02/22-rdf-syntax-ns#first"
                ) {
                  const waypointURI = quadItem.object.value;
                  waypointsInPath.push(waypointURI); // Die Waypoint-URI wird erfasst

                  // Überprüfen, ob der Waypoint in waypointsMap existiert
                  if (!waypointsMap[waypointURI]) {
                    console.error(
                      `Missing Waypoint in waypointsMap for URI: ${waypointURI}`
                    );
                  }
                }
                if (
                  quadItem.predicate.value ===
                  "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"
                ) {
                  currentListNode = quadItem.object.value;
                }
              }
            });
          }
          pathsMap[subject].waypoints = waypointsInPath
            .map((waypointURI) => {
              return waypointsMap[waypointURI];
            })
            .filter(Boolean);
        }
      });

      // If path is non existent, remove it from the scenario
      Object.keys(entitiesMap).forEach((entityURI) => {
        const entity = entitiesMap[entityURI];
        if (entity.followsPath && !pathsMap[entity.followsPath]) {
          entity.followsPath = null;
        }
        if (entity.fallbackPath && !pathsMap[entity.fallbackPath]) {
          entity.fallbackPath = null;
        }
      });

      if (currentScenario) {
        scenarios.push(currentScenario);
      }

      scenarios.forEach((scenario) => {
        scenario.entities = scenario.entities.map((entityURI) => {
          return entitiesMap[entityURI];
        });
        scenario.paths = scenario.paths.map((pathURI) => {
          return pathsMap[pathURI];
        });

        scenario.waypoints = scenario.waypoints
          .map((waypointURI) => {
            return waypointsMap[waypointURI];
          })
          .filter(Boolean);

        scenario.dboxes = scenario.dboxes.map((dboxURI) => {
          return dboxesMap[dboxURI];
        });
      });

      return scenarios;
    } catch (error) {
      console.error("Error in parseQuadsToScenarios:", error);
      return [];
    }
  },

  async getMap(mapName) {
    const response = await fetch("/assets/carjan/carjan-maps/maps.json");
    const maps = await response.json();
    this.carjanState.setMapName(mapName);
    return maps[mapName] || maps.map01;
  },

  async getDefaultMap() {
    this.carjanState.setMapName("map01");
    return await this.getMap("map01");
  },

  extractScenarioName(trigContent) {
    const match = trigContent.match(/<([^>]+)> \{/);
    if (match && match[1]) {
      const scenarioURI = match[1];
      return scenarioURI;
    }
    return null;
  },

  extractScenariosList(data) {
    const scenarios = [];

    data.forEach((item) => {
      if (item["@id"] === "http://example.com/carla-scenario#CarjanConfig") {
        const scenariosList =
          item["http://example.com/carla-scenario#scenarios"][0]["@list"];
        scenariosList.forEach((scenarioItem) => {
          const scenarioURI = scenarioItem["@id"];
          const scenarioName = scenarioURI.split("#")[1];
          scenarios.push(scenarioName);
        });
      }
    });

    return scenarios;
  },

  didInsertElement() {
    this._super(...arguments);

    setTimeout(() => {
      this.loading = false;
    }, 1000);
  },

  closeDialog() {
    this.$(".ui.modal").modal("hide");
    this.set("isDialogOpen", false);
    this.set("scenarioName", "");
    this.set("hasError", false);
  },

  showModal(modalSelector) {
    $(".ui.modal").remove();
    next(() => {
      Ember.$(modalSelector)
        .modal({
          closable: false,
          transition: "scale",
          duration: 500,
          dimmerSettings: { duration: { show: 500, hide: 500 } },
        })
        .modal("show");
    });
  },

  async saveSelectedScenario(scenarioName) {
    await fetch("http://localhost:4204/api/save_environment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "SELECTED_SCENARIO",
        value: scenarioName,
      }),
    });
  },

  async saveEnvironmentVariable(type, value) {
    const response = await fetch("http://localhost:4204/api/save_environment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, value }),
    });
    if (!response.ok) {
      throw new Error(`Fehler beim Speichern von ${type}.`);
    }
    return response;
  },

  actions: {
    async saveGithubInfo() {
      try {
        // Speichere GitHub-Daten
        await this.saveEnvironmentVariable(
          "GITHUB_REPO_USERNAME",
          this.githubRepoUsername
        );
        await this.saveEnvironmentVariable(
          "GITHUB_REPO_REPOSITORY",
          this.githubRepoRepository
        );
        await this.saveEnvironmentVariable("GITHUB_TOKEN", this.githubToken);

        this.set("areCredentialsValid", true);
      } catch (error) {
        console.error("Fehler beim Speichern der GitHub Informationen:", error);
      }
    },

    openMachineModal() {
      $(".ui.modal").remove();
      this.set("isMachineModalOpen", true);
      this.showModal(".ui.basic.modal");
    },

    async openRenameModal() {
      $(".ui.modal").remove();
      this.set("isRenameModalOpen", true);
      this.set("oldScenarioName", this.scenarioName);
      const { scenarios } = await this.fetchAgentDataFromRepo();
      this.set("existingScenarioNames", scenarios);
      this.showModal(".ui.basic.modal");
    },

    closeRenameModal() {
      this.set("isRenameModalOpen", false);
    },

    closeMachineModal() {
      this.set("isMachineModalOpen", false);
    },

    async saveScenarioName() {
      this.renameScenarioToRepository(
        this.oldScenarioName,
        this.scenarioName
      ).then(async (result) => {
        await this.saveEnvironmentVariable(
          "SELECTED_SCENARIO",
          this.scenarioName
        );
        this.updateWithResult(result).then(() => {
          setTimeout(() => {
            window.location.reload(true);
          }, 1000);
        });
      });
    },

    showToken() {
      document.getElementById("githubTokenInput").type = "text";
      this.set("hideToken", false);
    },
    hideToken() {
      document.getElementById("githubTokenInput").type = "password";
      this.set("hideToken", true);
    },

    openGithubModal() {
      $(".ui.modal").remove();
      this.set("areCredentialsValid", false);
      this.set("isGithubModalOpen", true);
      this.showModal(".ui.basic.modal");
      this.getEnvironmentData("GITHUB_REPO_USERNAME").then((data) => {
        this.set("githubRepoUsername", data);
      });
      this.getEnvironmentData("GITHUB_REPO_REPOSITORY").then((data) => {
        this.set("githubRepoRepository", data);
      });
      this.getEnvironmentData("GITHUB_TOKEN").then((data) => {
        this.set("githubToken", data);
      });
    },

    async uploadScenarioToGithub() {
      try {
        const scenarioName = this.carjanState.scenarioName;
        if (!scenarioName) {
          throw new Error("Scenario name is required.");
        }

        const trigContent = await this.downloadScenarioAsTrig(
          scenarioName,
          true,
          false
        );
        const response = await fetch(
          "http://localhost:4204/api/upload_to_github",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: trigContent,
              name: `${scenarioName}`,
            }),
          }
        );
        const result = await response.json();
      } catch (error) {
        console.error("Error uploading scenario:", error);
      }
    },

    async downloadScenarioFromGithub(scenarioName) {
      try {
        const response = await fetch(
          "http://localhost:4204/api/download_from_github",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              scenarioName,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Fehler beim Herunterladen des Szenarios von GitHub."
          );
        }

        const data = await response.text();
        if (data) {
          this.addScenarioToRepository(data).then((result) => {
            this.updateWithResult(result);
          });
        }
      } catch (error) {
        console.error("Error downloading scenario im frontend!:", error);
      }
    },

    async uploadRepositoryToGithub() {
      try {
        const trigContent = await this.downloadRepository();
        const response = await fetch(
          "http://localhost:4204/api/upload_to_github",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: trigContent,
              name: `repository_backup`,
            }),
          }
        );

        const result = await response.json();
      } catch (error) {
        console.error("Fehler beim Hochladen des Repositories:", error);
      }
    },

    async downloadRepositoryFromGithub() {
      try {
        const response = await fetch(
          "http://localhost:4204/api/download_from_github",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              scenarioName: "repository_backup",
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Fehler beim Herunterladen des Repositories von GitHub."
          );
        }

        const trigContent = await response.text();

        if (trigContent) {
          const parsedData = await this.parseTrig(trigContent);
          this.updateWithResult(parsedData);
        }
      } catch (error) {
        console.error(
          "Fehler beim Herunterladen des gesamten Repositories:",
          error
        );
      }
    },

    closeGithubModal() {
      set(this, "isGithubModalOpen", false);
    },

    async downloadScenario() {
      this.downloadScenarioAsTrig(this.scenarioName, true, true);
    },

    async openDeleteDialog() {
      $(".ui.modal").remove();
      this.set("isDeleteDialogOpen", true);
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

    confirmDelete() {
      this.$(".ui.modal").modal("hide");
      const selectedScenario = this.get("selectedValue");
      if (selectedScenario) {
        this.set("isDeleteDialogOpen", false);
        this.deleteScenarioFromRepository(selectedScenario).then((result) => {
          this.updateWithResult(result).then(() => {
            setTimeout(() => {
              window.location.reload(true);
            }, 1000);
          });
        });
      }
    },

    cancelDelete() {
      this.$(".ui.modal").modal("hide");
      this.set("isDeleteDialogOpen", false);
    },

    async openNewScenarioDialog() {
      $(".ui.modal").remove();
      this.set("isDialogOpen", true);
      this.set("scenarioName", "");
      this.set("hasError", false);

      this.showModal(".ui.basic.modal");

      const { scenarios } = await this.fetchAgentDataFromRepo();
      this.set("existingScenarioNames", scenarios);
    },

    async scenarioSelected(value) {
      if (value) {
        this.set("isSwitchScenarioDialogOpen", true);
        await this.saveSelectedScenario(value.displayName);
        document.getElementById("openModalButton").click();
      }
    },

    async openSwitchScenarioDialog() {
      $(".ui.modal").remove();
      this.set("isSwitchScenarioDialogOpen", true);
      this.showModal(".ui.basic.modal");
    },

    confirmSwitchScenario() {
      this.carjanState.setLoading(true);
      this.carjanState.saveRequest();
    },

    discardSwitchScenario() {
      this.carjanState.setLoading(true);
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    },

    closeNewScenarioDialog() {
      this.$(".ui.modal").modal("hide");
      this.set("isDialogOpen", false);
      this.set("scenarioName", "");
      this.set("hasError", false);
    },

    checkScenarioName() {
      const scenarioName = this.scenarioName.trim();
      const isNameEmpty = scenarioName === "";
      this.set("isNameEmpty", isNameEmpty);

      if (isNameEmpty) {
        this.set("hasError", false);
        this.set("errorMessage", "");
        return;
      }

      // Validierung des Szenarionamens
      const isValidName = /^[a-zA-Z0-9_]+$/.test(scenarioName);
      if (!isValidName) {
        this.set("hasError", true);
        this.set(
          "errorMessage",
          "Invalid scenario name. Only letters, numbers, and underscores are allowed."
        );
        return;
      }

      if (this.existingScenarioNames) {
        const existingScenarioNames = this.existingScenarioNames.map((name) =>
          name.toLowerCase()
        );
        const nameTaken = existingScenarioNames.includes(
          scenarioName.toLowerCase()
        );
        if (nameTaken) {
          this.set("hasError", true);
          this.set("errorMessage", "Scenario name already taken.");
          return;
        }
      }
      this.set("hasError", false);
      this.set("errorMessage", "");
    },

    async generateNewScenario() {
      const scenarioName = this.scenarioName.trim();

      if (this.hasError || !scenarioName) {
        return;
      }

      await this.saveEnvironmentVariable(
        "SELECTED_SCENARIO",
        this.scenarioName
      );

      const trigContent = `
        @prefix : <http://example.com/carla-scenario#> .
        @prefix carjan: <http://example.com/carla-scenario#> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        :${scenarioName} {
          :${scenarioName} rdf:type carjan:Scenario ;
            carjan:label "${scenarioName}" ;
            carjan:map "map01" ;
            carjan:cameraPosition "down" ;
            carjan:weather "Clear" ;
            carjan:showGrid "true" ;
            carjan:showPaths "true" ;
            carjan:loadLayers "false" .
        }
        `;

      try {
        const result = await this.addScenarioToRepository(trigContent);
        this.updateWithResult(result);
      } catch (error) {
        console.error("Fehler beim Erstellen des neuen Szenarios:", error);
      }
    },

    uploadFile() {
      this.deleteRepo = true;
      document.getElementById("fileInput").click();
    },

    uploadScenario() {
      this.deleteRepo = false;
      document.getElementById("scenarioFileInput").click();
    },

    switchMap(mapName) {
      this.setMap(mapName);
    },

    downloadAll() {
      this.downloadRepository(true);
    },

    triggerSaveScenario() {
      setTimeout(() => {
        this.carjanState.saveRequest();
      }, 500);
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    },

    handleFile(event) {
      if (
        !event ||
        !event.target ||
        !event.target.files ||
        event.target.files.length === 0
      ) {
        return;
      }

      const file = event.target.files[0];

      if (file && file.name.endsWith(".trig")) {
        const reader = new FileReader();

        reader.onload = (e) => {
          const trigContent = e.target.result;
          this.parseTrig(trigContent).then((result) => {
            this.updateWithResult(result);
          });
        };

        reader.readAsText(file);
      }
    },

    handleScenario(event) {
      if (
        !event ||
        !event.target ||
        !event.target.files ||
        event.target.files.length === 0
      ) {
        return;
      }

      const file = event.target.files[0];

      if (file && file.name.endsWith(".trig")) {
        const reader = new FileReader();

        reader.onload = (e) => {
          this.addScenarioToRepository(e.target.result).then((result) => {
            this.updateWithResult(result);
          });
        };

        reader.readAsText(file);
      }
    },
  },

  async addPrefixes() {
    return (
      `@prefix : <http://example.com/carla-scenario#> .\n` +
      `@prefix carjan: <http://example.com/carla-scenario#> .\n` +
      `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n` +
      `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`
    );
  },

  async updateWithResult(result) {
    this.updateCarjanRepo(result).then(() => {
      this.loadGrid();
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    });
  },

  async updateCarjanState(scenarioName) {
    const existingRepositoryContent = await this.downloadRepository();
    const existingDataset = await this.parseTrig(existingRepositoryContent);

    const copiedDataset = JSON.parse(JSON.stringify(existingDataset));
    copiedDataset.scenarios.forEach((scenario) => {
      scenario.displayName = scenario.scenarioName.split("#")[1];
    });
    this.carjanState.setRepository(copiedDataset);

    existingDataset.scenarios = existingDataset.scenarios.filter(
      (existingScenario) =>
        existingScenario.scenarioName.split("#")[1] === scenarioName
    );

    if (existingDataset.scenarios.length > 0) {
      this.carjanState.setScenario(existingDataset);
    } else {
      console.warn("No scenario found in repository for name:", scenarioName);
    }
  },

  async renameScenarioToRepository(oldScenarioName, newScenarioName) {
    try {
      // Repository-Inhalte herunterladen
      let existingRepositoryContent = await this.downloadRepository();
      existingRepositoryContent = existingRepositoryContent || [];

      // Repository-Inhalte parsen
      const existingDataset = await this.parseTrig(existingRepositoryContent);

      // Szenarien-Label extrahieren
      const scenarioLabels = existingDataset.scenarios.map(
        (scenario) => scenario.scenarioName
      );

      // Überprüfen, ob das Szenario existiert und umbenennen
      const scenarioToRename = existingDataset.scenarios.find(
        (scenario) =>
          scenario.scenarioName ===
          `http://example.com/carla-scenario#${oldScenarioName}`
      );

      if (scenarioToRename) {
        // Szenario umbenennen
        scenarioToRename.scenarioName = `http://example.com/carla-scenario#${newScenarioName}`;

        // Entferne das alte Szenario (falls es noch existiert)
        existingDataset.scenarios = existingDataset.scenarios.filter(
          (scenario) =>
            scenario.scenarioName !==
            `http://example.com/carla-scenario#${oldScenarioName}`
        );
      } else {
        console.error(`Scenario with name ${oldScenarioName} not found`);
        throw new Error(`Scenario with name ${oldScenarioName} not found`);
      }

      // Sicherstellen, dass das neue Szenario nur hinzugefügt wird, wenn es nicht schon existiert
      if (
        !scenarioLabels.includes(
          `http://example.com/carla-scenario#${newScenarioName}`
        )
      ) {
        existingDataset.scenarios.push(scenarioToRename);
      }

      return existingDataset;

      // Das aktualisierte Dataset zurückgeben
    } catch (error) {
      console.error("Error in renameScenarioToRepository:", error);
      throw error;
    }
  },

  async addScenarioToRepository(newScenarioContent) {
    try {
      let existingRepositoryContent = await this.downloadRepository();
      existingRepositoryContent = existingRepositoryContent || [];

      const existingDataset = await this.parseTrig(existingRepositoryContent);
      const newScenarioDataset = await this.parseTrig(newScenarioContent);
      const newScenarioLabels = newScenarioDataset.scenarios.map(
        (scenario) => scenario.scenarioName
      );

      existingDataset.scenarios = existingDataset.scenarios.filter(
        (existingScenario) =>
          !newScenarioLabels.includes(existingScenario.scenarioName)
      );

      existingDataset.scenarios.push(...newScenarioDataset.scenarios);

      return existingDataset;
    } catch (error) {
      console.error("Error in addScenarioToRepository:", error);
      throw error;
    }
  },

  async deleteScenarioFromRepository(scenarioLabelToDelete) {
    const existingRepositoryContent = await this.downloadRepository();
    const existingDataset = await this.parseTrig(existingRepositoryContent);
    existingDataset.scenarios = existingDataset.scenarios.filter(
      (existingScenario) =>
        existingScenario.scenarioName.split("#")[1] !== scenarioLabelToDelete
    );

    return existingDataset;
  },

  async downloadRepository(flag = false) {
    try {
      const { scenarios } = await this.fetchAgentDataFromRepo();
      let trigContent = "";
      trigContent += await this.addPrefixes();
      for (const scenario of scenarios) {
        trigContent += await this.downloadScenarioAsTrig(
          scenario,
          false,
          false
        );
      }

      if (flag) {
        // Wenn der Download-Flag gesetzt ist, speichere die Datei
        const blob = new Blob([trigContent], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `repository.trig`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return trigContent;
      }

      return trigContent;
    } catch (error) {
      console.error("Fehler beim Herunterladen des Repositorys:", error);
    }
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        resolve(event.target.result);
      };
      reader.onerror = function (error) {
        reject(error);
      };
      reader.readAsText(file);
    });
  },

  namedNode(value) {
    const [prefix, localName] = value.split(":");
    if (prefixes[prefix]) {
      return rdf.namedNode(prefixes[prefix] + localName);
    } else {
      return rdf.namedNode(value);
    }
  },

  async loadGrid() {
    this.checkRepository().then(() => {
      setTimeout(() => {
        this.loadMapAndAgents(this.get("selectedValue"));
      }, 200);
    });
  },

  async loadMapAndAgents(scenarioName = null) {
    try {
      const { scenarios, scenarioData } = await this.fetchAgentDataFromRepo(
        scenarioName
      );

      if (scenarioName === null) {
        this.set("selectedValue", scenarios[0]);
        scenarioName = scenarios[0];
      }

      const agents = this.extractAgentsData(scenarioData);
      const {
        mapName,
        cameraPosition,
        weather,
        showGrid,
        showPaths,
        loadLayers,
      } = this.extractScenarioData(scenarioData);
      const map = mapName
        ? await this.getMap(mapName)
        : await this.getDefaultMap();

      this.carjanState.setMapData(map);
      this.carjanState.setAgentData(agents);
      this.carjanState.setWeather(weather);
      this.carjanState.setGridInCarla(showGrid);
      this.carjanState.setPathsInCarla(showPaths);
      this.carjanState.setLoadLayersInCarla(loadLayers);
      this.carjanState.setCameraPosition(cameraPosition);

      this.updateCarjanState(scenarioName);
    } catch (error) {
      console.error("Fehler beim Laden der Map und Agents:", error);
    }
  },

  async downloadScenarioAsTrig(scenarioName, prefixes = true, download = true) {
    try {
      const { scenarioData } = await this.fetchAgentDataFromRepo(scenarioName);
      if (!scenarioData) {
        return;
      }

      // Starte den TriG-Text
      let trigContent = "";
      if (prefixes) {
        trigContent += await this.addPrefixes();
      }

      trigContent += `:${scenarioName} {\n`;
      // Entitäten und Szenario-Daten
      const scenarioGraph = scenarioData["@graph"];

      // Szenario-Daten hinzufügen
      scenarioGraph.forEach((item) => {
        const id = item["@id"].split("#")[1]; // Nur der Identifier nach dem Hash

        let currentItemContent = "";
        if (
          item["@type"] &&
          item["@type"].includes("http://example.com/carla-scenario#Scenario")
        ) {
          // Füge die Szenario-Eigenschaften hinzu
          currentItemContent += `    :${id} rdf:type carjan:Scenario ;\n`;

          if (item["http://example.com/carla-scenario#map"]) {
            currentItemContent += `      carjan:map "${item["http://example.com/carla-scenario#map"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#cameraPosition"]) {
            currentItemContent += `      carjan:cameraPosition "${item["http://example.com/carla-scenario#cameraPosition"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#weather"]) {
            currentItemContent += `      carjan:weather "${item["http://example.com/carla-scenario#weather"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#showGrid"]) {
            currentItemContent += `      carjan:showGrid "${item["http://example.com/carla-scenario#showGrid"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#showPaths"]) {
            currentItemContent += `      carjan:showPaths "${item["http://example.com/carla-scenario#showPaths"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#loadLayers"]) {
            currentItemContent += `      carjan:loadLayers "${item["http://example.com/carla-scenario#loadLayers"][0]["@value"]}" ;\n`;
          }

          // Entitäten hinzufügen
          if (item["http://example.com/carla-scenario#hasEntity"]) {
            const entities = item[
              "http://example.com/carla-scenario#hasEntity"
            ].map((entity) => `:${entity["@id"].split("#")[1]}`);
            currentItemContent += `      carjan:hasEntity ${entities.join(
              " , "
            )} ;\n`;
          }

          // Pfade hinzufügen
          if (item["http://example.com/carla-scenario#hasPath"]) {
            const paths = item["http://example.com/carla-scenario#hasPath"].map(
              (path) => `:${path["@id"].split("#")[1]}`
            );
            currentItemContent += `      carjan:hasPath ${paths.join(
              " , "
            )} ;\n`;
          }

          // Waypoints hinzufügen
          if (item["http://example.com/carla-scenario#hasWaypoints"]) {
            const waypoints = item[
              "http://example.com/carla-scenario#hasWaypoints"
            ].map((path) => `:${path["@id"].split("#")[1]}`);
            currentItemContent += `      carjan:hasWaypoints ${waypoints.join(
              " , "
            )} ;\n`;
          }

          // DBoxes hinzufügen
          if (item["http://example.com/carla-scenario#hasDecisionBoxes"]) {
            const dboxes = item[
              "http://example.com/carla-scenario#hasDecisionBoxes"
            ].map((dbox) => `:${dbox["@id"].split("#")[1]}`);
            currentItemContent += `      carjan:hasDecisionBoxes ${dboxes.join(
              " , "
            )} ;\n`;
          }
        }

        // Füge die Entitäten hinzu
        if (
          (item["@type"] &&
            (item["@type"].includes(
              "http://example.com/carla-scenario#Vehicle"
            ) ||
              item["@type"].includes(
                "http://example.com/carla-scenario#Pedestrian"
              ))) ||
          item["@type"].includes(
            "http://example.com/carla-scenario#Autonomous"
          ) ||
          item["@type"].includes("http://example.com/carla-scenario#Obstacle")
        ) {
          let entityType = item["@type"][0].split("#")[1];
          currentItemContent += `    :${id} rdf:type carjan:${entityType} ;\n`;

          if (item["http://example.com/carla-scenario#x"]) {
            currentItemContent += `      carjan:x "${item["http://example.com/carla-scenario#x"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#y"]) {
            currentItemContent += `      carjan:y "${item["http://example.com/carla-scenario#y"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#heading"]) {
            currentItemContent += `      carjan:heading "${item["http://example.com/carla-scenario#heading"][0]["@value"]}";\n`;
          }

          if (item["http://example.com/carla-scenario#followsPath"]) {
            currentItemContent += `      carjan:followsPath "${item["http://example.com/carla-scenario#followsPath"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#fallbackPath"]) {
            currentItemContent += `      carjan:fallbackPath "${item["http://example.com/carla-scenario#fallbackPath"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#model"]) {
            currentItemContent += `      carjan:model "${item["http://example.com/carla-scenario#model"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#label"]) {
            currentItemContent += `      carjan:label "${item["http://example.com/carla-scenario#label"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#color"]) {
            currentItemContent += `      carjan:color "${item["http://example.com/carla-scenario#color"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#behavior"]) {
            currentItemContent += `      carjan:behavior "${item["http://example.com/carla-scenario#behavior"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#decisionBox"]) {
            currentItemContent += `      carjan:decisionBox "${item["http://example.com/carla-scenario#decisionBox"][0]["@value"]}" ;\n`;
          }
        }

        // Füge die Pfade hinzu
        if (
          item["@type"] &&
          item["@type"].includes("http://example.com/carla-scenario#Path")
        ) {
          currentItemContent += `    :${id} rdf:type carjan:Path ;\n`;

          if (item["http://example.com/carla-scenario#description"]) {
            currentItemContent += `      carjan:description "${item["http://example.com/carla-scenario#description"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#color"]) {
            currentItemContent += `      carjan:color "${item["http://example.com/carla-scenario#color"][0]["@value"]}" ;\n`;
          }

          // Füge die Waypoints zu den Paths hinzu
          if (item["http://example.com/carla-scenario#hasWaypoints"]) {
            const waypointsList =
              item["http://example.com/carla-scenario#hasWaypoints"][0][
                "@list"
              ];
            const waypoints = waypointsList.map(
              (waypoint) => `:${waypoint["@id"].split("#")[1]}`
            );
            currentItemContent += `      carjan:hasWaypoints ( ${waypoints.join(
              " "
            )} ) ;\n`;
          }
        }

        // Füge die Waypoints hinzu
        if (
          item["@type"] &&
          item["@type"].includes("http://example.com/carla-scenario#Waypoint")
        ) {
          currentItemContent += `    :${id} rdf:type carjan:Waypoint ;\n`;

          if (item["http://example.com/carla-scenario#x"]) {
            currentItemContent += `      carjan:x "${item["http://example.com/carla-scenario#x"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#y"]) {
            currentItemContent += `      carjan:y "${item["http://example.com/carla-scenario#y"][0]["@value"]}"^^xsd:integer`;
          }

          if (item["http://example.com/carla-scenario#waitTime"]) {
            currentItemContent += `;\n      carjan:waitTime "${item["http://example.com/carla-scenario#waitTime"][0]["@value"]}"^^xsd:integer ;\n`;
          }
          if (item["http://example.com/carla-scenario#positionInCell"]) {
            currentItemContent += `      carjan:positionInCell "${item["http://example.com/carla-scenario#positionInCell"][0]["@value"]}" ;\n`;
          }
        }

        // Füge die Decision Boxes hinzu
        if (
          item["@type"] &&
          item["@type"].includes(
            "http://example.com/carla-scenario#DecisionBox"
          )
        ) {
          currentItemContent += `    :${id} rdf:type carjan:DecisionBox ;\n`;

          if (item["http://example.com/carla-scenario#id"]) {
            currentItemContent += `      carjan:id "${item["http://example.com/carla-scenario#id"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#startX"]) {
            currentItemContent += `      carjan:startX "${item["http://example.com/carla-scenario#startX"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#startY"]) {
            currentItemContent += `      carjan:startY "${item["http://example.com/carla-scenario#startY"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#endX"]) {
            currentItemContent += `      carjan:endX "${item["http://example.com/carla-scenario#endX"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#endY"]) {
            currentItemContent += `      carjan:endY "${item["http://example.com/carla-scenario#endY"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#label"]) {
            currentItemContent += `      carjan:label "${item["http://example.com/carla-scenario#label"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#color"]) {
            currentItemContent += `      carjan:color "${item["http://example.com/carla-scenario#color"][0]["@value"]}" ;\n`;
          }
        }

        trigContent +=
          currentItemContent.trim().slice(-1) === ";"
            ? currentItemContent.trim().slice(0, -1) + " .\n"
            : currentItemContent + "\n";
        trigContent += "\n";
      });
      trigContent = trigContent.trim() + "\n"; // Remove trailing newline
      trigContent += "}\n\n";
      // Download als .trig-Datei
      if (download) {
        const blob = new Blob([trigContent], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${scenarioName}.trig`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        return trigContent;
      }
    } catch (error) {
      console.error("Fehler beim Laden des Szenarios:", error);
    }
  },

  async updateCarjanRepo(statements) {
    await this.checkRepository();
    if (this.deleteRepo) {
      await this.deleteStatements();
    }

    setTimeout(async () => {
      await this.updateWithStatements(statements);
    }, 200);
  },

  async updateWithStatements(statements) {
    const scenarioURIs = [];
    for (const scenario of statements.scenarios) {
      scenarioURIs.push(scenario.scenarioName);
      await this.addRDFStatements(scenario);
    }
    this.addGlobalConfig(scenarioURIs);

    await this.updateRepo();
  },

  addGlobalConfig(scenarioURIs) {
    const configURI = this.namedNode("carjan:CarjanConfig");

    // Füge das carjan:CarjanConfig-Objekt hinzu
    rdfGraph.add(
      rdf.quad(
        configURI,
        this.namedNode("rdf:type"),
        this.namedNode("carjan:Config")
      )
    );

    // Erstelle die RDF-Liste manuell
    let listNode = rdf.namedNode("_:b0"); // Start mit einem Blank Node
    rdfGraph.add(
      rdf.quad(configURI, this.namedNode("carjan:scenarios"), listNode)
    );

    for (let i = 0; i < scenarioURIs.length; i++) {
      // Füge rdf:first und rdf:rest hinzu
      rdfGraph.add(
        rdf.quad(
          listNode,
          this.namedNode("rdf:first"),
          rdf.namedNode(scenarioURIs[i])
        )
      );

      if (i < scenarioURIs.length - 1) {
        const nextListNode = rdf.namedNode(`_:b${i + 1}`);
        rdfGraph.add(
          rdf.quad(listNode, this.namedNode("rdf:rest"), nextListNode)
        );
        listNode = nextListNode;
      } else {
        // Letztes Element, rdf:rest auf rdf:nil setzen
        rdfGraph.add(
          rdf.quad(
            listNode,
            this.namedNode("rdf:rest"),
            this.namedNode("rdf:nil")
          )
        );
      }
    }
  },

  async parseTrig(trigContent) {
    try {
      const trigStream = stringToStream(trigContent);
      const parser = new N3Parser({ format: "application/trig" });
      const quads = await rdf.dataset().import(parser.import(trigStream));
      const scenarios = await this.parseQuadsToScenarios(quads);

      return { scenarios };
    } catch (error) {
      console.error("Error parsing Trig file:", error);
    }
  },

  async addRDFStatements(scenario) {
    const scenarioURI = rdf.namedNode(scenario.scenarioName);
    const graph = scenarioURI; // Verwende das Szenario als Named Graph

    // Füge das Szenario hinzu
    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        this.namedNode("rdf:type"),
        this.namedNode("carjan:Scenario"),
        graph
      )
    );

    // Füge Szenario-Eigenschaften hinzu (Label, Kategorie, Map, Wetter, Kamera)
    if (scenario.label) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:label"),
          rdf.literal(scenario.label),
          graph
        )
      );
    }

    if (scenario.category) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:category"),
          this.namedNode(`carjan:${scenario.category}`),
          graph
        )
      );
    }

    if (scenario.scenarioMap) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:map"),
          rdf.literal(scenario.scenarioMap),
          graph
        )
      );
    }

    if (scenario.weather) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:weather"),
          rdf.literal(scenario.weather),
          graph
        )
      );
    }

    if (scenario.showGrid) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:showGrid"),
          rdf.literal(scenario.showGrid),
          graph
        )
      );
    }

    if (scenario.showPaths) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:showPaths"),
          rdf.literal(scenario.showPaths),
          graph
        )
      );
    }

    if (scenario.loadLayers) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:loadLayers"),
          rdf.literal(scenario.loadLayers),
          graph
        )
      );
    }

    if (scenario.cameraPosition) {
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:cameraPosition"),
          rdf.literal(scenario.cameraPosition),
          graph
        )
      );
    }

    // Füge die Entitäten hinzu und verknüpfe sie mit dem Szenario
    for (const entity of scenario.entities) {
      const entityURI = rdf.namedNode(entity.entity);

      rdfGraph.add(
        rdf.quad(
          entityURI,
          this.namedNode("rdf:type"),
          this.namedNode(`carjan:${entity.type}`),
          graph
        )
      );

      if (entity.x !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:x"),
            rdf.literal(entity.x, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (entity.y !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:y"),
            rdf.literal(entity.y, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (entity.label !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:label"),
            rdf.literal(entity.label),
            graph
          )
        );
      }

      if (entity.color !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:color"),
            rdf.literal(entity.color),
            graph
          )
        );
      }

      if (entity.heading !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:heading"),
            rdf.literal(entity.heading),
            graph
          )
        );
      }

      if (entity.followsPath !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:followsPath"),
            rdf.literal(entity.followsPath),
            graph
          )
        );
      }

      if (entity.fallbackPath !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:fallbackPath"),
            rdf.literal(entity.fallbackPath),
            graph
          )
        );
      }

      if (entity.model !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:model"),
            rdf.literal(entity.model),
            graph
          )
        );
      }

      if (entity.behavior !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:behavior"),
            rdf.literal(entity.behavior),
            graph
          )
        );
      }

      if (entity.decisionBox !== undefined) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:decisionBox"),
            rdf.literal(entity.decisionBox),
            graph
          )
        );
      }

      // Verknüpfe die Entität mit dem Szenario
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:hasEntity"),
          entityURI,
          graph
        )
      );
    }

    // Füge die Waypoints hinzu und verknüpfe sie mit dem Szenario
    for (const waypoint of scenario.waypoints) {
      const waypointURI = rdf.namedNode(waypoint.waypoint);

      rdfGraph.add(
        rdf.quad(
          waypointURI,
          this.namedNode("rdf:type"),
          this.namedNode("carjan:Waypoint"),
          graph
        )
      );

      if (waypoint.x !== undefined) {
        rdfGraph.add(
          rdf.quad(
            waypointURI,
            this.namedNode("carjan:x"),
            rdf.literal(waypoint.x, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (waypoint.y !== undefined) {
        rdfGraph.add(
          rdf.quad(
            waypointURI,
            this.namedNode("carjan:y"),
            rdf.literal(waypoint.y, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (waypoint.waitTime !== undefined) {
        rdfGraph.add(
          rdf.quad(
            waypointURI,
            this.namedNode("carjan:waitTime"),
            rdf.literal(waypoint.waitTime, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (waypoint.positionInCell !== undefined) {
        rdfGraph.add(
          rdf.quad(
            waypointURI,
            this.namedNode("carjan:positionInCell"),
            rdf.literal(waypoint.positionInCell),
            graph
          )
        );
      }

      // Verknüpfe den Waypoint direkt mit dem Szenario
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:hasWaypoints"),
          waypointURI,
          graph
        )
      );
    }

    // Füge die Paths hinzu und verknüpfe sie mit dem Szenario
    for (const path of scenario.paths) {
      const pathURI = rdf.namedNode(path.path);

      rdfGraph.add(
        rdf.quad(
          pathURI,
          this.namedNode("rdf:type"),
          this.namedNode("carjan:Path"),
          graph
        )
      );

      if (path.description) {
        rdfGraph.add(
          rdf.quad(
            pathURI,
            this.namedNode("carjan:description"),
            rdf.literal(path.description),
            graph
          )
        );
      }

      if (path.color) {
        rdfGraph.add(
          rdf.quad(
            pathURI,
            this.namedNode("carjan:color"),
            rdf.literal(path.color),
            graph
          )
        );
      }

      // Verknüpfe den Path mit dem Szenario
      rdfGraph.add(
        rdf.quad(scenarioURI, this.namedNode("carjan:hasPath"), pathURI, graph)
      );

      // Füge die Waypoints zu den Paths hinzu
      if (path.waypoints && path.waypoints.length > 0) {
        let listNode = rdf.blankNode(); // Start mit einem Blank Node für die Waypoints-Liste

        rdfGraph.add(
          rdf.quad(
            pathURI,
            this.namedNode("carjan:hasWaypoints"),
            listNode,
            graph
          )
        );

        for (let i = 0; i < path.waypoints.length; i++) {
          const waypoint = path.waypoints[i];
          const waypointURI = rdf.namedNode(waypoint.waypoint);

          // Füge den Waypoint als RDF-Resource hinzu
          rdfGraph.add(
            rdf.quad(
              waypointURI,
              this.namedNode("rdf:type"),
              this.namedNode("carjan:Waypoint"),
              graph
            )
          );

          if (waypoint.x !== undefined) {
            rdfGraph.add(
              rdf.quad(
                waypointURI,
                this.namedNode("carjan:x"),
                rdf.literal(waypoint.x, this.namedNode("xsd:integer")),
                graph
              )
            );
          }

          if (waypoint.y !== undefined) {
            rdfGraph.add(
              rdf.quad(
                waypointURI,
                this.namedNode("carjan:y"),
                rdf.literal(waypoint.y, this.namedNode("xsd:integer")),
                graph
              )
            );
          }

          if (waypoint.waitTime !== undefined) {
            rdfGraph.add(
              rdf.quad(
                waypointURI,
                this.namedNode("carjan:waitTime"),
                rdf.literal(waypoint.waitTime, this.namedNode("xsd:integer")),
                graph
              )
            );
          }

          // Füge rdf:first und rdf:rest für die RDF-Liste hinzu
          rdfGraph.add(
            rdf.quad(listNode, this.namedNode("rdf:first"), waypointURI, graph)
          );

          if (i < path.waypoints.length - 1) {
            const nextListNode = rdf.blankNode(); // Nächster Blank Node für rdf:rest
            rdfGraph.add(
              rdf.quad(
                listNode,
                this.namedNode("rdf:rest"),
                nextListNode,
                graph
              )
            );
            listNode = nextListNode;
          } else {
            // Letzter Waypoint, rdf:rest auf rdf:nil setzen
            rdfGraph.add(
              rdf.quad(
                listNode,
                this.namedNode("rdf:rest"),
                this.namedNode("rdf:nil"),
                graph
              )
            );
          }
        }
      }
    }

    // Füge die Decision Boxes hinzu und verknüpfe sie mit dem Szenario
    for (const dbox of scenario.dboxes) {
      const dboxURI = rdf.namedNode(
        `http://example.com/carla-scenario#${dbox.label}`
      );
      rdfGraph.add(
        rdf.quad(
          dboxURI,
          this.namedNode("rdf:type"),
          this.namedNode("carjan:DecisionBox"),
          graph
        )
      );

      if (dbox.id !== undefined) {
        rdfGraph.add(
          rdf.quad(
            dboxURI,
            this.namedNode("carjan:id"),
            rdf.literal(dbox.id),
            graph
          )
        );
      }

      if (dbox.startX !== undefined) {
        console.log("adding startX");
        rdfGraph.add(
          rdf.quad(
            dboxURI,
            this.namedNode("carjan:startX"),
            rdf.literal(dbox.startX, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (dbox.startY !== undefined) {
        rdfGraph.add(
          rdf.quad(
            dboxURI,
            this.namedNode("carjan:startY"),
            rdf.literal(dbox.startY, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (dbox.endX !== undefined) {
        rdfGraph.add(
          rdf.quad(
            dboxURI,
            this.namedNode("carjan:endX"),
            rdf.literal(dbox.endX, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (dbox.endY !== undefined) {
        rdfGraph.add(
          rdf.quad(
            dboxURI,
            this.namedNode("carjan:endY"),
            rdf.literal(dbox.endY, this.namedNode("xsd:integer")),
            graph
          )
        );
      }

      if (dbox.label !== undefined) {
        rdfGraph.add(
          rdf.quad(
            dboxURI,
            this.namedNode("carjan:label"),
            rdf.literal(dbox.label),
            graph
          )
        );
      }

      if (dbox.color !== undefined) {
        rdfGraph.add(
          rdf.quad(
            dboxURI,
            this.namedNode("carjan:color"),
            rdf.literal(dbox.color),
            graph
          )
        );
      }

      // Verknüpfe die Decision Box mit dem Szenario
      rdfGraph.add(
        rdf.quad(
          scenarioURI,
          this.namedNode("carjan:hasDecisionBoxes"),
          dboxURI,
          graph
        )
      );
    }
  },

  async updateRepo() {
    const repoUrl = "http://localhost:8090/rdf4j/repositories/carjan";
    const ajax = this.ajax;

    const onEnd = (error) => {
      if (error) {
        console.error("Error adding RDF data to repository:", error);
        return;
      }
    };

    try {
      // Verwenden Sie actions.saveAgentGraph, um die RDF-Daten hochzuladen
      actions.saveAgentGraph(ajax, repoUrl, this.dataBus, onEnd);
    } catch (error) {
      console.error("Error updating repository:", error);
    }
  },

  async fetchAgentDataFromRepo(scenarioName = null) {
    const repoURL =
      "http://localhost:8090/rdf4j/repositories/carjan/statements";
    const headers = {
      Accept: "application/ld+json; charset=utf-8",
    };

    try {
      const response = await fetch(repoURL, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();

      const scenarios = this.extractScenariosList(data);
      let scenarioData = null;

      if (scenarioName) {
        scenarioData = data.find(
          (item) =>
            item["@graph"] &&
            item["@id"] === `http://example.com/carla-scenario#${scenarioName}`
        );
      } else {
        scenarioData = data[1];
      }
      return { data, scenarios, scenarioData };
    } catch (error) {
      console.error("Error fetching agent data from Triplestore:", error);
      return { data: [], scenarios: [], scenarioData: null };
    }
  },

  extractScenarioData(scenarioData) {
    let mapName = null;
    let cameraPosition = null;
    let weather = null;
    let showGrid = null;
    let showPaths = null;
    let loadLayers = null;

    if (scenarioData && scenarioData["@graph"]) {
      scenarioData["@graph"].forEach((graphItem) => {
        if (
          graphItem["@type"] &&
          graphItem["@type"].some(
            (type) => type === "http://example.com/carla-scenario#Scenario"
          )
        ) {
          // Extract the map name
          if (graphItem["http://example.com/carla-scenario#map"]) {
            mapName =
              graphItem["http://example.com/carla-scenario#map"][0]["@value"];
          }

          // Extract the camera position
          if (graphItem["http://example.com/carla-scenario#cameraPosition"]) {
            cameraPosition =
              graphItem["http://example.com/carla-scenario#cameraPosition"][0][
                "@value"
              ];
          }

          // Extract the weather
          if (graphItem["http://example.com/carla-scenario#weather"]) {
            weather =
              graphItem["http://example.com/carla-scenario#weather"][0][
                "@value"
              ];
          }

          // Extract the showGrid
          if (graphItem["http://example.com/carla-scenario#showGrid"]) {
            showGrid =
              graphItem["http://example.com/carla-scenario#showGrid"][0][
                "@value"
              ];
          }

          if (graphItem["http://example.com/carla-scenario#showPaths"]) {
            showPaths =
              graphItem["http://example.com/carla-scenario#showPaths"][0][
                "@value"
              ];
          }

          if (graphItem["http://example.com/carla-scenario#loadLayers"]) {
            loadLayers =
              graphItem["http://example.com/carla-scenario#loadLayers"][0][
                "@value"
              ];
          }
        }
      });
    }
    return {
      mapName,
      cameraPosition,
      weather,
      showGrid,
      showPaths,
      loadLayers,
    };
  },

  extractAgentsData(scenarioData) {
    const agents = [];

    if (scenarioData && scenarioData["@graph"]) {
      scenarioData["@graph"].forEach((graphItem) => {
        const id = graphItem["@id"];

        if (
          graphItem["@type"] &&
          graphItem["@type"].some(
            (type) =>
              type === "http://example.com/carla-scenario#Entity" ||
              type === "http://example.com/carla-scenario#Pedestrian" ||
              type === "http://example.com/carla-scenario#Vehicle" ||
              type === "http://example.com/carla-scenario#Autonomous" ||
              type === "http://example.com/carla-scenario#Obstacle"
          )
        ) {
          const x =
            graphItem["http://example.com/carla-scenario#x"] &&
            graphItem["http://example.com/carla-scenario#x"][0]
              ? graphItem["http://example.com/carla-scenario#x"][0]["@value"]
              : null;

          const y =
            graphItem["http://example.com/carla-scenario#y"] &&
            graphItem["http://example.com/carla-scenario#y"][0]
              ? graphItem["http://example.com/carla-scenario#y"][0]["@value"]
              : null;

          const label =
            graphItem["http://example.com/carla-scenario#label"] &&
            graphItem["http://example.com/carla-scenario#label"][0]
              ? graphItem["http://example.com/carla-scenario#label"][0][
                  "@value"
                ]
              : null;

          const color =
            graphItem["http://example.com/carla-scenario#color"] &&
            graphItem["http://example.com/carla-scenario#color"][0]
              ? graphItem["http://example.com/carla-scenario#color"][0][
                  "@value"
                ]
              : null;

          const heading =
            graphItem["http://example.com/carla-scenario#heading"] &&
            graphItem["http://example.com/carla-scenario#heading"][0]
              ? graphItem["http://example.com/carla-scenario#heading"][0][
                  "@value"
                ]
              : null;

          const followsPath =
            graphItem["http://example.com/carla-scenario#followsPath"] &&
            graphItem["http://example.com/carla-scenario#followsPath"][0]
              ? graphItem["http://example.com/carla-scenario#followsPath"][0][
                  "@value"
                ]
              : null;

          const fallbackPath =
            graphItem["http://example.com/carla-scenario#fallbackPath"] &&
            graphItem["http://example.com/carla-scenario#fallbackPath"][0]
              ? graphItem["http://example.com/carla-scenario#fallbackPath"][0][
                  "@value"
                ]
              : null;

          const model =
            graphItem["http://example.com/carla-scenario#model"] &&
            graphItem["http://example.com/carla-scenario#model"][0]
              ? graphItem["http://example.com/carla-scenario#model"][0][
                  "@value"
                ]
              : null;

          const behavior =
            graphItem["http://example.com/carla-scenario#behavior"] &&
            graphItem["http://example.com/carla-scenario#behavior"][0]
              ? graphItem["http://example.com/carla-scenario#behavior"][0][
                  "@value"
                ]
              : null;

          const decisionBox =
            graphItem["http://example.com/carla-scenario#decisionBox"] &&
            graphItem["http://example.com/carla-scenario#decisionBox"][0]
              ? graphItem["http://example.com/carla-scenario#decisionBox"][0][
                  "@value"
                ]
              : null;

          const entityType = graphItem["@type"].reduce((type, currentType) => {
            if (
              currentType === "http://example.com/carla-scenario#Pedestrian"
            ) {
              return "pedestrian";
            } else if (
              currentType === "http://example.com/carla-scenario#Vehicle"
            ) {
              return "vehicle";
            } else if (
              currentType === "http://example.com/carla-scenario#Autonomous"
            ) {
              return "autonomous";
            } else if (
              currentType === "http://example.com/carla-scenario#Obstacle"
            ) {
              return "obstacle";
            }
            return type;
          }, "unknown");

          if (x !== null && y !== null) {
            agents.push({
              entity: id,
              x: parseInt(x, 10),
              y: parseInt(y, 10),
              type: entityType,
              label: "null" ? null : label,
              color: "null" ? null : color,
              heading: "null" ? null : heading,
              followsPath: "null" ? null : followsPath,
              fallbackPath: "null" ? null : fallbackPath,
              model: "null" ? null : model,
              behavior: "null" ? null : behavior,
              decisionBox: "null" ? null : decisionBox,
            });
          }
        }
      });
    }

    return agents;
  },

  async deleteRepository() {
    try {
      const response = await fetch(
        "http://localhost:4204/api/delete-carjan-repo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting CARJAN repository:", error);
    }
  },

  async deleteStatements() {
    try {
      const response = await fetch(
        "http://localhost:4204/api/delete-statements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting CARJAN repository:", error);
    }
  },

  async checkRepository() {
    try {
      const response = await fetch(
        "http://localhost:4204/api/check-repository",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.message) {
        this.initializeCarjanRepo();
      }
    } catch (error) {
      console.error("Repository is not available. Initializing repository...");
      await this.initializeCarjanRepo();
    }
  },

  async initializeCarjanRepo() {
    try {
      const response = await this.get("ajax").post(
        "http://localhost:4204/api/init-carjan-repo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error initializing CARJAN repository:", error);
    }
  },
});
