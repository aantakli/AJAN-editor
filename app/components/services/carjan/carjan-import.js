import $ from "jquery";
import actions from "ajan-editor/helpers/carjan/actions";
import Component from "@ember/component";
import N3Parser from "npm:rdf-parser-n3";
import { computed } from "@ember/object";
import { debounce, next } from "@ember/runloop";
import { observer } from "@ember/object";
import { inject as service } from "@ember/service";
import rdf from "npm:rdf-ext";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import stringToStream from "npm:string-to-stream";

let self;

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
  scenarioName: "",
  hasError: false,
  isNameEmpty: true,
  isDisabled: computed("hasError", "isNameEmpty", function () {
    return this.hasError || this.isNameEmpty;
  }),

  init() {
    this._super(...arguments);
    self = this;
    rdfGraph.set(rdf.dataset());
  },

  updateObserver: observer("carjanState.updateStatements", function () {
    const statements = this.carjanState.updateStatements;
    rdfGraph.set(rdf.dataset());
    rdfGraph.set(statements);
    this.updateRepo();
  }),

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
    this.loadGrid();
    this.fetchAgentDataFromRepo().then(({ scenarios }) => {
      if (scenarios && scenarios.length > 0) {
        let sortedScenarios = scenarios.sort((a, b) => a.localeCompare(b));
        const firstScenario = sortedScenarios[0];
        this.set("selectedValue", firstScenario);
        this.set("availableScenarios", sortedScenarios);

        this.loadMapAndAgents(firstScenario);

        Ember.run.scheduleOnce("afterRender", this, function () {
          this.$(".ui.dropdown")
            .dropdown({
              onChange: (value) => {
                this.send("scenarioSelected", value);
              },
            })
            .dropdown("set selected", firstScenario);
        });
      } else {
        console.error("No scenarios found in repository");
      }
    });
  },

  actions: {
    scenarioSelected(value) {
      this.scenarioName = value;
      this.set("selectedValue", value);
      if (value) {
        this.loadMapAndAgents(value);
      }
    },

    async downloadScenario() {
      this.downloadScenarioAsTrig(this.scenarioName);
    },

    async openDeleteDialog() {
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
      this.set("isDialogOpen", true);
      this.set("scenarioName", "");
      this.set("hasError", false);

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

      const { scenarios } = await this.fetchAgentDataFromRepo();
      this.set("existingScenarioNames", scenarios);
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

      const existingScenarioNames = this.existingScenarioNames.map((name) =>
        name.toLowerCase()
      );
      const nameTaken = existingScenarioNames.includes(
        scenarioName.toLowerCase()
      );

      if (nameTaken) {
        this.set("hasError", true);
        this.set("errorMessage", "Scenario name already taken.");
      } else {
        this.set("hasError", false);
        this.set("errorMessage", "");
      }
    },

    async generateNewScenario() {
      const scenarioName = this.scenarioName.trim();

      if (this.hasError || !scenarioName) {
        return;
      }

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
            carjan:weather "Clear" .
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

    downloadTurtle() {
      // Die URL des RDF4J-Endpunkts
      const url = "http://localhost:8090/rdf4j/repositories/carjan/statements";

      // Die Anfrage zum Herunterladen der Statements im Turtle-Format
      fetch(url, {
        headers: {
          Accept: "text/turtle", // Fordert Turtle-Format an
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch Turtle data");
          }
          return response.text();
        })
        .then((data) => {
          // Erstelle einen Blob aus den erhaltenen Turtle-Daten
          const blob = new Blob([data], { type: "text/turtle" });
          const link = document.createElement("a");

          // Erstelle eine temporäre URL für den Blob und setze den Download-Name
          const url = window.URL.createObjectURL(blob);
          link.href = url;
          link.download = "scenario-statements.ttl";

          // Simuliere einen Klick auf den Link, um den Download auszulösen
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Lösche die temporäre URL
          window.URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error("Error downloading Turtle data:", error);
        });
    },

    triggerSaveScenario() {
      this.carjanState.saveRequest();
      //timeout 1s
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    },

    async saveAndReset() {
      $("#toast").fadeIn();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.saveEditorToRepo();

      $("#toast").fadeOut();
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

      if (file && file.name.endsWith(".ttl")) {
        const reader = new FileReader();

        reader.onload = (e) => {
          const turtleContent = e.target.result;
          this.parseTurtle(turtleContent).then((result) => {
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

  async updateWithResult(result) {
    this.updateCarjanRepo(result).then(() => {
      this.loadGrid();
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    });
  },

  async addScenarioToRepository(newScenarioContent) {
    const existingRepositoryContent = await this.downloadRepository();
    const existingDataset = await this.parseTurtle(existingRepositoryContent);
    const newScenarioDataset = await this.parseTurtle(newScenarioContent);

    const newScenarioLabels = newScenarioDataset.scenarios.map(
      (scenario) => scenario.label
    );

    existingDataset.scenarios = existingDataset.scenarios.filter(
      (existingScenario) => !newScenarioLabels.includes(existingScenario.label)
    );

    existingDataset.scenarios.push(...newScenarioDataset.scenarios);

    return existingDataset;
  },

  async deleteScenarioFromRepository(scenarioLabelToDelete) {
    const existingRepositoryContent = await this.downloadRepository();

    const existingDataset = await this.parseTurtle(existingRepositoryContent);

    existingDataset.scenarios = existingDataset.scenarios.filter(
      (existingScenario) => existingScenario.label !== scenarioLabelToDelete
    );

    return existingDataset;
  },
  async downloadRepository() {
    const repoUrl =
      "http://localhost:8090/rdf4j/repositories/carjan/statements";
    const response = await fetch(repoUrl, {
      method: "GET",
      headers: {
        Accept: "application/trig",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Fehler beim Herunterladen des Repositories: ${response.statusText}`
      );
    }

    const trigContent = await response.text();
    return trigContent;
  },

  async serializeDataset(dataset) {
    return new Promise((resolve, reject) => {
      const writer = new N3.Writer({ format: "application/trig" });
      writer.addQuads([...dataset]);
      writer.end((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
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

  parseTrigContent(content) {
    // Verwenden Sie rdf-ext und rdf-parser-n3 zum Parsen des TriG-Inhalts
    const parser = new N3Parser({ format: "application/trig" });
    const stream = stringToStream(content);
    return parser.import(stream);
  },

  uploadDatasetToRepo(dataset) {
    // Serialisieren des Datasets in TriG
    const serializer = new N3.Writer({ format: "application/trig" });
    dataset.toStream().pipe(serializer);
    return new Promise((resolve, reject) => {
      serializer.end(async (error, result) => {
        if (error) {
          reject(error);
        } else {
          // Upload zum Triplestore
          const repoUrl =
            "http://localhost:8090/rdf4j/repositories/carjan/statements";
          try {
            const response = await fetch(repoUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/trig",
              },
              body: result,
            });
            if (!response.ok) {
              reject(`Error uploading data: ${response.statusText}`);
            } else {
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        }
      });
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
        this.loadMapAndAgents();
      }, 200);
    });
  },

  async loadMapAndAgents(scenarioName) {
    try {
      const { scenarios, scenarioData } = await this.fetchAgentDataFromRepo(
        scenarioName
      );

      if (!scenarioData) {
        return;
      }

      const agents = this.extractAgentsData(scenarioData);
      const scenarioMap = this.extractMapData(scenarioData);

      const map = scenarioMap
        ? await this.getMap(scenarioMap)
        : await this.getDefaultMap();

      this.carjanState.setMapData(map);
      this.carjanState.setAgentData(agents);

      // Optional: Aktualisieren der verfügbaren Szenarien
      this.carjanState.setAvailableScenarios(scenarios);
    } catch (error) {
      console.error("Fehler beim Laden der Map und Agents:", error);
    }
  },

  async downloadScenarioAsTrig(scenarioName) {
    try {
      const { scenarioData } = await this.fetchAgentDataFromRepo(scenarioName);

      if (!scenarioData) {
        return;
      }

      // Starte den TriG-Text
      let trigContent = `@prefix : <http://example.com/carla-scenario#> .\r
    @prefix carjan: <http://example.com/carla-scenario#> .\r
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\r
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n:${scenarioName} {\n`;

      // Entitäten und Szenario-Daten
      const scenarioGraph = scenarioData["@graph"];

      // Szenario-Daten hinzufügen
      scenarioGraph.forEach((item) => {
        const id = item["@id"].split("#")[1]; // Nur der Identifier nach dem Hash

        if (
          item["@type"] &&
          item["@type"].includes("http://example.com/carla-scenario#Scenario")
        ) {
          // Füge die Szenario-Eigenschaften hinzu
          trigContent += `  :${id} rdf:type carjan:Scenario ;\n`;

          if (item["http://example.com/carla-scenario#label"]) {
            trigContent += `    carjan:label "${item["http://example.com/carla-scenario#label"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#category"]) {
            const category =
              item["http://example.com/carla-scenario#category"][0][
                "@id"
              ].split("#")[1];
            trigContent += `    carjan:category carjan:${category} ;\n`;
          }

          if (item["http://example.com/carla-scenario#map"]) {
            trigContent += `    carjan:map "${item["http://example.com/carla-scenario#map"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#cameraPosition"]) {
            trigContent += `    carjan:cameraPosition "${item["http://example.com/carla-scenario#cameraPosition"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#weather"]) {
            trigContent += `    carjan:weather "${item["http://example.com/carla-scenario#weather"][0]["@value"]}" ;\n`;
          }

          // Entitäten hinzufügen
          if (item["http://example.com/carla-scenario#hasEntity"]) {
            const entities = item[
              "http://example.com/carla-scenario#hasEntity"
            ].map((entity) => `:${entity["@id"].split("#")[1]}`);
            trigContent += `    carjan:hasEntity ${entities.join(" , ")} ;\n`;
          }

          trigContent += "  }\n\n";
        }

        // Füge die Entitäten hinzu
        if (
          item["@type"] &&
          (item["@type"].includes(
            "http://example.com/carla-scenario#Vehicle"
          ) ||
            item["@type"].includes(
              "http://example.com/carla-scenario#Pedestrian"
            ))
        ) {
          const entityType = item["@type"][0].split("#")[1];

          trigContent += `  :${id} rdf:type carjan:${entityType} ;\n`;

          if (item["http://example.com/carla-scenario#label"]) {
            trigContent += `    carjan:label "${item["http://example.com/carla-scenario#label"][0]["@value"]}" ;\n`;
          }

          if (item["http://example.com/carla-scenario#x"]) {
            trigContent += `    carjan:x "${item["http://example.com/carla-scenario#x"][0]["@value"]}"^^xsd:integer ;\n`;
          }

          if (item["http://example.com/carla-scenario#y"]) {
            trigContent += `    carjan:y "${item["http://example.com/carla-scenario#y"][0]["@value"]}"^^xsd:integer .\n\n`;
          }
        }
      });

      // Download als .trig-Datei
      const blob = new Blob([trigContent], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${scenarioName}.trig`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Fehler beim Laden der Map und Agents:", error);
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
    // Array zum Sammeln der Szenario-URIs
    const scenarioURIs = [];

    // Iterieren über alle Szenarien
    for (const scenario of statements.scenarios) {
      // Fügen Sie die Szenario-URI dem Array hinzu
      scenarioURIs.push(scenario.scenarioName);

      // Fügen Sie das Szenario dem RDF-Graph hinzu
      await this.addRDFStatements(scenario);
    }

    // Globale Konfiguration hinzufügen
    this.addGlobalConfig(scenarioURIs);

    // Nach dem Hinzufügen aller Szenarien das Repository aktualisieren
    await this.updateRepo();
    rdfGraph.set(rdf.dataset());
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

  async parseTurtle(turtleContent) {
    try {
      const turtleStream = stringToStream(turtleContent);
      const parser = new N3Parser({ format: "application/trig" });
      const quads = await rdf.dataset().import(parser.import(turtleStream));

      const scenarios = [];
      let currentScenario = null;

      const entitiesMap = {}; // Map zur Speicherung der Entitäten anhand ihrer URI

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
            // Speichere das vorherige Szenario
            scenarios.push(currentScenario);
          }

          // Neues Szenario beginnen
          currentScenario = {
            scenarioName: subject,
            scenarioMap: "map01", // Standardkarte
            entities: [],
            cameraPosition: null,
            label: "",
            category: "",
            weather: "",
          };
        }

        // Eigenschaften des aktuellen Szenarios extrahieren
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
        }

        // Entitäten erfassen
        if (
          predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
          (object === "http://example.com/carla-scenario#Vehicle" ||
            object === "http://example.com/carla-scenario#Pedestrian")
        ) {
          const entityType = object.split("#")[1];

          // Initialisieren von entitiesMap[subject] für Entitäten
          if (!entitiesMap[subject]) {
            entitiesMap[subject] = {
              entity: subject,
              type: entityType,
              label: undefined,
              x: undefined,
              y: undefined,
            };
          } else {
            entitiesMap[subject].type = entityType;
          }
        }

        // Label der Entitäten zuweisen
        if (
          entitiesMap[subject] &&
          predicate === "http://example.com/carla-scenario#label"
        ) {
          entitiesMap[subject].label = object.replace(/^"|"$/g, "");
        }

        // X- und Y-Koordinaten der Entitäten zuweisen
        if (entitiesMap[subject]) {
          if (predicate === "http://example.com/carla-scenario#x") {
            entitiesMap[subject].x = object.replace(/^"|"$/g, "");
          }
          if (predicate === "http://example.com/carla-scenario#y") {
            entitiesMap[subject].y = object.replace(/^"|"$/g, "");
          }
        }
      });

      if (currentScenario) {
        // Speichere das letzte Szenario
        scenarios.push(currentScenario);
      }

      // Ersetze die Entity-URIs in den Szenarien durch die tatsächlichen Entitätsobjekte aus entitiesMap
      scenarios.forEach((scenario) => {
        scenario.entities = scenario.entities.map(
          (entityURI) => entitiesMap[entityURI]
        );
      });

      return { scenarios };
    } catch (error) {
      console.error("Error parsing Turtle file:", error);
    }
  },

  async addRDFStatements(scenario) {
    const scenarioURI = rdf.namedNode(scenario.scenarioName);

    // Szenario als Named Graph verwenden
    const graph = scenarioURI;

    // Füge das Szenario hinzu
    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        this.namedNode("rdf:type"),
        this.namedNode("carjan:Scenario"),
        graph
      )
    );

    // Füge Szenario-Eigenschaften hinzu
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

      // Füge die Entität hinzu
      rdfGraph.add(
        rdf.quad(
          entityURI,
          this.namedNode("rdf:type"),
          this.namedNode(`carjan:${entity.type}`),
          graph
        )
      );

      if (entity.label) {
        rdfGraph.add(
          rdf.quad(
            entityURI,
            this.namedNode("carjan:label"),
            rdf.literal(entity.label),
            graph
          )
        );
      }

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
      actions.saveAgentGraph(ajax, repoUrl, self.dataBus, onEnd);
    } catch (error) {
      console.error("Error updating repository:", error);
    }
  },

  saveEditorToRepo() {
    const gridContainer = document.querySelector("#gridContainer");
    if (!gridContainer) {
      console.error("GridContainer not found");
      return;
    }

    const scenarioURI = rdf.namedNode(
      "http://example.com/carla-scenario#CurrentScenario"
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        rdf.namedNode("http://example.com/carla-scenario#Scenario")
      )
    );

    const cells = gridContainer.querySelectorAll(".grid-cell");
    let entityCount = 1;

    cells.forEach((cell) => {
      const row = cell.dataset.row;
      const col = cell.dataset.col;

      const isOccupied = cell.getAttribute("data-occupied") === "true";
      const entityType = cell.getAttribute("data-entity-type");

      if (isOccupied) {
        const paddedEntityNumber = String(entityCount).padStart(4, "0"); // Vierstellige Nummer
        let entityURI;

        // Basierend auf dem Typ die Entitäts-URI erstellen
        if (entityType === "pedestrian") {
          entityURI = rdf.namedNode(
            `http://example.com/carla-scenario#Pedestrian${paddedEntityNumber}`
          );
        } else if (entityType === "vehicle") {
          entityURI = rdf.namedNode(
            `http://example.com/carla-scenario#Vehicle${paddedEntityNumber}`
          );
        } else if (entityType === "autonomous") {
          entityURI = rdf.namedNode(
            `http://example.com/carla-scenario#AutonomousVehicle${paddedEntityNumber}`
          );
        } else {
          entityURI = rdf.namedNode(
            `http://example.com/carla-scenario#Entity${paddedEntityNumber}`
          ); // Generischer Fall
        }

        // Entity zum Scenario hinzufügen
        rdfGraph.add(
          rdf.quad(
            scenarioURI,
            rdf.namedNode("http://example.com/carla-scenario#hasEntity"),
            entityURI
          )
        );

        // Typ der Entität festlegen
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

        // SpawnPointX hinzufügen
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

        // SpawnPointY hinzufügen
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

        entityCount++; // Zähler für die nächste Entität erhöhen
      }
    });

    this.updateRepo();
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
      }

      return { data, scenarios, scenarioData };
    } catch (error) {
      console.error("Error fetching agent data from Triplestore:", error);
      return { data: [], scenarios: [], scenarioData: null };
    }
  },

  extractMapData(scenarioData) {
    let mapName = null;

    if (scenarioData && scenarioData["@graph"]) {
      scenarioData["@graph"].forEach((graphItem) => {
        if (
          graphItem["@type"] &&
          graphItem["@type"].some(
            (type) => type === "http://example.com/carla-scenario#Scenario"
          )
        ) {
          if (graphItem["http://example.com/carla-scenario#map"]) {
            mapName =
              graphItem["http://example.com/carla-scenario#map"][0]["@value"];
          }
        }
      });
    }

    return mapName;
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
              type === "http://example.com/carla-scenario#AutonomousVehicle"
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

          let entityType = "unknown";
          if (
            graphItem["@type"].some(
              (type) => type === "http://example.com/carla-scenario#Pedestrian"
            )
          ) {
            entityType = "pedestrian";
          } else if (
            graphItem["@type"].some(
              (type) => type === "http://example.com/carla-scenario#Vehicle"
            )
          ) {
            entityType = "vehicle";
          } else if (
            graphItem["@type"].some(
              (type) =>
                type === "http://example.com/carla-scenario#AutonomousVehicle"
            )
          ) {
            entityType = "autonomous";
          }

          if (x !== null && y !== null) {
            agents.push({
              entity: id,
              x: parseInt(x, 10),
              y: parseInt(y, 10),
              type: entityType,
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
