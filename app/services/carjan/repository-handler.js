export default {
  async fetchScenarioData() {
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
      return this.extractAgentsData(data);
    } catch (error) {
      console.error("Error fetching agent data from Triplestore:", error);
    }
  },

  extractAgentsData(data) {
    const agents = [];
    data.forEach((item) => {
      const id = item["@id"];
      if (
        item["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] &&
        item["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"].some(
          (type) => type["@id"] === "http://example.com/carla-scenario#Entity"
        )
      ) {
        const x =
          item["http://example.com/carla-scenario#spawnPointX"] &&
          item["http://example.com/carla-scenario#spawnPointX"][0]
            ? item["http://example.com/carla-scenario#spawnPointX"][0]["@value"]
            : null;

        const y =
          item["http://example.com/carla-scenario#spawnPointY"] &&
          item["http://example.com/carla-scenario#spawnPointY"][0]
            ? item["http://example.com/carla-scenario#spawnPointY"][0]["@value"]
            : null;

        if (x && y) {
          agents.push({
            entity: id.substring(id.indexOf("#") + 1),
            x: parseInt(x, 10),
            y: parseInt(y, 10),
          });
        }
      }
    });
    return agents;
  },
};
