/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Alex Grethen (German Research Center for Artificial Intelligence, DFKI).
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// Contains SPAQRL queries

export default {
	constructGraph: `CONSTRUCT {?s ?p ?o}
WHERE {?s ?p ?o}`,

  deleteAll: function () {
    return (
      `DELETE%20{?s%20?p%20?o}%20WHERE%20{?s%20?p%20?o}`
    );
  },

  insert: function (str) {
    return (
    `INSERT DATA{` +
      str +
      `}`
    );
  },

  update: function (str) {
    console.log(str);
		return (
			`DELETE { ?s ?p ?o } WHERE { ?s ?p ?o };
INSERT DATA{` +
			str +
			`}`
		);
	},

	createNamedGraph: function(graph) {
		return `CREATE SILENT GRAPH <${graph}>`;
	},

	constructNamedGraph: function(graph) {
		return `CONSTRUCT {?s ?p ?o}
WHERE {
  GRAPH  <${graph}> {
    ?s ?p ?o
  }
}`;
	},

	insertInGraph: function(graph, triples) {
		return `INSERT DATA {
	GRAPH  <${graph}> {
		${triples}
	}
}
		`;
	},

	deleteInsertInGraph: function(graph, deleteTriples, insertTriples) {
		return `DELETE {
	GRAPH  <${graph}> {
		${deleteTriples}
	}
}
WHERE {
	GRAPH  <${graph}> {
		${deleteTriples}
	}
};
INSERT DATA {
	GRAPH  <${graph}> {
		${insertTriples}
	}
}
		`;
	},

	deleteInGraph: function(graph, deleteTriples) {
		return `DELETE {
	GRAPH  <${graph}> {
		${deleteTriples}
	}
}
WHERE {
	GRAPH  <${graph}> {
		${deleteTriples}
	}
}`;
  },

  getAllServiceActions: `PREFIX ajan: <http://www.ajan.de/ajan-ns#> 
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
            PREFIX actn: <http://www.ajan.de/actn#> 
            DESCRIBE ?s ?b ?a 
            WHERE {
              ?s rdf:type actn:ServiceAction. 
              ?s actn:runBinding ?b. 
              OPTIONAL {
                  ?s actn:abortBinding ?a. 
              } 
            } `
}
