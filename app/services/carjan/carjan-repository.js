const http = require("http");

function initializeCarjanRepository() {
  return new Promise((resolve, reject) => {
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

module.exports = { initializeCarjanRepository };
