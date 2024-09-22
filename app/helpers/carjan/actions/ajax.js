import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import SparqlQueries from "ajan-editor/helpers/RDFServices/queries";
import tokenizer from "ajan-editor/helpers/token";

export default {
  saveGraph: function (ajax, tripleStoreRepository, event, onEnd) {
    return Promise.resolve(
      tokenizer.resolveToken(ajax, localStorage.currentStore)
    ).then((token) =>
      checkAndCreateRepository(token, ajax, tripleStoreRepository, event, onEnd)
    );
  },
};

// Funktion zur Überprüfung, ob das Repository existiert
function checkAndCreateRepository(
  token,
  ajax,
  tripleStoreRepository,
  event,
  onEnd
) {
  return checkRepositoryExists(ajax, tripleStoreRepository, token)
    .then((exists) => {
      if (!exists) {
        console.log(
          "Repository does not exist, creating repository:",
          tripleStoreRepository
        );
        return createRepository(ajax, tripleStoreRepository, token).then(() =>
          updateCarjanRepo(token, ajax, tripleStoreRepository, event, onEnd)
        );
      } else {
        return updateCarjanRepo(
          token,
          ajax,
          tripleStoreRepository,
          event,
          onEnd
        );
      }
    })
    .catch((error) => {
      console.error("Error checking/creating repository:", error);
    });
}

function checkRepositoryExists(ajax, tripleStoreRepository, token) {
  // Überprüfen, ob das Repository existiert
  return ajax
    .request(tripleStoreRepository, {
      method: "GET",
      headers: getHeaders(token),
    })
    .then(() => true)
    .catch((error) => {
      if (error.status === 404) {
        return false;
      } else {
        throw error;
      }
    });
}

// Funktion zur Erstellung des Repositories
function createRepository(ajax, tripleStoreRepository, token) {
  const repoCreationEndpoint =
    "http://localhost:8090/rdf4j-server/repositories"; // Hier wird das Repository erstellt
  const repoConfig = `
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
    @prefix rep: <http://www.openrdf.org/config/repository#>.
    @prefix sr: <http://www.openrdf.org/config/repository/sail#>.
    @prefix sail: <http://www.openrdf.org/config/sail#>.
    @prefix mm: <http://example.com/mynamespace#> .

    [] a rep:Repository ;
       rep:repositoryID "carjan" ;
       rdfs:label "CARJAN repository" ;
       rep:repositoryImpl [
         rep:repositoryType "openrdf:SailRepository" ;
         sr:sailImpl [
           sail:sailType "openrdf:NativeStore" ;
           sail:params [
             sail:parameterName "tripleIndexes";
             sail:parameterValue "spoc,posc";
           ]
         ]
       ].
  `;

  // Sende die Konfiguration zur Erstellung des Repositories
  return ajax
    .post(repoCreationEndpoint, {
      contentType: "text/turtle; charset=utf-8",
      headers: getHeaders(token),
      data: repoConfig,
    })
    .then(() => {
      console.log("Repository created successfully.");
    })
    .catch((error) => {
      console.error("Error creating repository:", error);
    });
}

function updateCarjanRepo(token, ajax, tripleStoreRepository, event, onEnd) {
  console.log("Saving to triple store: ", tripleStoreRepository);

  const postDestination = `${tripleStoreRepository}/statements`; // Speichern in das Repository
  const rdfString = rdfGraph.toString(); // RDF-Daten als String
  const query = SparqlQueries.update(rdfString); // SPARQL-Update-Query
  const dataString = $.param({ update: query }); // URL-kodierte Daten

  // Daten an den Triple-Store senden
  return ajax
    .post(postDestination, {
      contentType: "application/x-www-form-urlencoded; charset=utf-8",
      headers: getHeaders(token),
      data: dataString,
    })
    .then(() => {
      console.log('RDF data added to repository "carjan".');
      if (event) {
        event.updatedAG();
      }
      if (onEnd) {
        onEnd();
      }
    })
    .catch((error) => {
      console.error("Error updating repository:", error);
    });
}

function getHeaders(token) {
  if (token) {
    return {
      Authorization: "Bearer " + token,
      Accept: "application/sparql-update; charset=utf-8",
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    };
  } else {
    return {
      Accept: "application/sparql-update; charset=utf-8",
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    };
  }
}
