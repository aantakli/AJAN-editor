const http = require("http");

const repositoryConfig = `
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      @prefix rep: <http://www.openrdf.org/config/repository#> .
      @prefix sr: <http://www.openrdf.org/config/repository/sail#> .
      @prefix sail: <http://www.openrdf.org/config/sail#> .
      @prefix carjan: <http://example.com/carla-scenario#> .

      [] a rep:Repository ;
         rep:repositoryID "carjan" ;
         rdfs:label "CARJAN Scenario Repository" ;
         rep:repositoryImpl [
             rep:repositoryType "openrdf:SailRepository" ;
             sr:sailImpl [
                 sail:sailType "openrdf:NativeStore"
             ]
         ] .
    `;

function initializeCarjanRepository() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 8090,
      path: "/rdf4j/repositories/carjan",
      method: "PUT",
      headers: {
        "Content-Type": "application/x-turtle",
        "Content-Length": Buffer.byteLength(repositoryConfig),
      },
    };

    const req = http.request(options, (res) => {
      if (
        res.statusCode === 200 ||
        res.statusCode === 201 ||
        res.statusCode === 204
      ) {
        resolve("Repository created successfully.");
      } else {
        reject(
          new Error(
            `Failed to create repository. Status code: ${res.statusCode}: ${res.statusMessage}`
          )
        );
      }
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.write(repositoryConfig);
    req.end();
  });
}

function deleteStatements() {
  return new Promise((resolve, reject) => {
    const query = `
      DELETE WHERE {
        ?entity ?predicate ?object .
      }
    `;

    const options = {
      hostname: "localhost",
      port: 8090,
      path: "/rdf4j/repositories/carjan/statements",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 204) {
        resolve("Old data deleted successfully.");
      } else {
        reject(new Error(`Failed to delete repository: ${res.statusCode}`));
      }
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.write(`update=${encodeURIComponent(query)}`);
    req.end();
  });
}

function deleteCarjanRepository() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 8090,
      path: "/rdf4j/repositories/carjan",
      method: "DELETE",
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 204) {
        resolve("Repository deleted successfully.");
      } else {
        reject(
          new Error(
            `Failed to delete repository. Status code: ${res.statusCode}: ${res.statusMessage}`
          )
        );
      }
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.end();
  });
}
function checkIfRepositoryExists() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 8090,
      path: "/rdf4j/repositories",
      method: "GET",
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const rows = data.split("\n");
        const repositoryExists = rows.some((row) => row.includes("carjan"));

        if (repositoryExists) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.end();
  });
}

module.exports = {
  initializeCarjanRepository,
  deleteStatements,
  deleteCarjanRepository,
  checkIfRepositoryExists,
};
