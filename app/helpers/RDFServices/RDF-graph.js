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
import {RDF, RDFS, XSD, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";

class RDFGraph {
	constructor() {
    this.data = undefined;
    this.unsavedMethod = undefined;
    this.publishedChanges = false;
		this.unsavedChanges = false;
	}

	// Only used for initiating
	reset() {
		this.data = undefined;
    this.unsavedChanges = false;
    this.unsavedMethod = undefined;
    this.publishedChanges = false;
  }

  set(newData) {
    this.data = newData;
    this.unsavedChanges = false;
    this.unsavedMethod = undefined;
    this.publishedChanges = false;
  }

  setUnsavedMethod(unsavedMethod) {
    if (!this.unsavedMethod) {
      this.unsavedMethod = unsavedMethod;
    }
  }

  setUnsavedChanges(value) {
    this.unsavedChanges = value;
      if (this.unsavedMethod && this.unsavedChanges && !this.publishedChanges) {
      this.publishedChanges = true;
      this.unsavedMethod();
    }
  }

	get() {
		return this.data;
	}

	add(quad) {
		this.data.add(quad);
    this.setUnsavedChanges(true);
	}

  addAll(quads) {
		this.data.addAll(quads);
    this.setUnsavedChanges(true);
	}

	existsSome(value) {
		return this.data.some(quad => {
			return (
				quad.subject.value === value ||
				quad.predicate.value === value ||
				quad.object.value === value
			);
		});
	}

	getNode(nodeURI) {
		let node;
		this.data._quads.find(quad => {
			if (quad.subject.value === nodeURI) return (node = quad.subject);
			if (quad.predicate.value === nodeURI) return (node = quad.predicate);
			if (quad.object.value === nodeURI) return (node = quad.object);
		});
		return node;
	}

	// check whether has the class used for later highlight
	getNode(nodeURI) {
		let node;
		this.data._quads.find(quad => {
			if (quad.object.value === nodeURI) return (node = quad.subject);
		});
		return node;
	}

	remove(quad) {
		this.data.remove(quad);
    this.setUnsavedChanges(true);
		console.warn("Delete", quad);
	}

	removeMatches(ele) {
		this.data.removeMatches(ele);
    this.setUnsavedChanges(true);
		console.warn("Delete matches", ele);
	}

	findQuad(s, p, o, g) {
		return this.data._quads.find(quad => {
			return (
				(s ? quad.subject.value === s : true) &&
				(p ? quad.predicate.value === p : true) &&
				(o ? quad.object.value === o : true) &&
				(g ? quad.graph.value === g : true)
			);
		});
	}

	forEach(params) {
		return this.data.forEach(params);
	}

	getAllQuads(s, p, o, g) {
		return this.data._quads.filter(quad => {
			return (
				(s ? quad.subject.value === s : true) &&
				(p ? quad.predicate.value === p : true) &&
				(o ? quad.object.value === o : true) &&
				(g ? quad.graph.value === g : true)
			);
		});
  }

	getObjectValue(s, p) {
		try {
			return this.findQuad(s, p).object.value;
		} catch (error) {
			//console.warn('Could not find target quad: ', s, p);
		}
	}

	getObject(s, p) {
		try {
			return this.findQuad(s, p).object;
		} catch (error) {
			//console.warn('Could not find target quad: ', s, p);
		}
	}

	getTypes(nodeURI) {
		let types = [];
		this.data.forEach(quad => {
			if (quad.subject.value === nodeURI && quad.predicate.value === RDF.type) {
				types.push(quad.object.value);
			}
		});
		return types;
	}

	setObjectValue(s, p, o, type = XSD.string) {
		if (!s || !p) return;
		let quad = this.findQuad(s, p);
		if (quad) {
			// Update quad
      if (o !== quad.object.value) {
				quad.object.value = o;
        this.setUnsavedChanges(true);
			}
		} else {
			// Create and add quad
			console.log("Could not find triple, generating new one: ", s, p, o);
			this.add(rdfFact.quadLiteral(s, p, o, type));
		}
	}

	setObject(s, p, o) {
		if (!s || !p) return;
		let quad = this.findQuad(s, p);
		if (quad) {
			// Update quad
      if (o.value !== quad.object.value) {
				quad.object = o;
        this.setUnsavedChanges(true);
			}
		} else {
			// Create and add quad
      console.log("Could not find triple, generating new one: ", s, p, o);
      this.add(rdfFact.quad(s, p, o));
		}
	}

	// Removes all quads which have an element related to val
  removeAllRelated(val, noObject) {
    this.setUnsavedChanges(true);
    console.warn("Delete related to", val);
    if (noObject) {
      this.data._quads = this.data._quads.filter(quad => {
        return (
          quad.subject.value !== val &&
          quad.predicate.value !== val
        );
      });
    } else {
      this.data._quads = this.data._quads.filter(quad => {
        return (
          quad.subject.value !== val &&
          quad.predicate.value !== val &&
          quad.object.value !== val
        );
      });
    }
  }

  removeNamedGraph(val) {
    this.setUnsavedChanges(true);
    console.warn("Delete NamedGraph", val);
    this.data._quads = this.data._quads.filter(quad => {
      return (
        quad.graph.value !== val
      );
    });
  }

  removeRelatedQuads(subject, predicate) {
    this.setUnsavedChanges(true);
    let remove = [];
    console.warn("Delete related to", subject, predicate);
    this.data.forEach(quad => {
      if (quad.subject.value == subject && quad.predicate.value === predicate) {
        remove.push(quad);
      }
    });
    this.removeQuads(remove);
  }

  removeQuads(remove) {
    remove.forEach(quad => {
      this.data.remove(quad);
    });
  }

	removeQuad(removeQuad) {
    this.setUnsavedChanges(true);
		console.warn("Delete", removeQuad);
		this.data._quads = this.data._quads.filter(quad => {
			return !removeQuad.equals(quad);
		});
	}

  toString(quads) {
    if (quads == null) {
      quads = this.data;
    }
    let array = [];
    array.push("@prefix xsd: <http://www.w3.org/2001/XMLSchema#> . ");
    quads.forEach(quad => {
      let str = "";
      let subj = termEval(quad.subject);
      let pred = termEval(quad.predicate);
      let obje = termEval(quad.object);
      if (quad.graph.value != "") {
        let graph = termEval(quad.graph);
        str = graph + "{ " + subj + " " + pred + " " + obje + " . } " ;
      } else {
        str = subj + " " + pred + " " + obje + " . ";
      }
      array.push(str);
    });
    return array.join("");
  }
} // end class def

// Helpers
function termEval(term) {
	let result = undefined;
	switch (term.termType) {
		case "Literal":
      switch (term.datatype.value) {
        case RDFS.Resource:
          result = "<" + term.value + ">";
          break;
				case XSD.double:
					result = '"""' + term.value + '"""^^xsd:double';
					break;
				case XSD.float:
					result = '"""' + term.value + '"""^^xsd:float';
					break;
				case XSD.anyURI:
          result = "<" + term.value + ">";
					break;
				case XSD.long:
					result = '"""' + term.value + '"""^^xsd:long';
					break;
				case XSD.int:
					result = '"""' + term.value + '"""^^xsd:int';
					break;
				case XSD.boolean:
					result = '"""' + term.value + '"""^^xsd:boolean';
					break;
				case XSD.string:
					result = '"""' + term.value + '"""^^xsd:string';
					break;
				default:
					result = '"""' + term.value + '"""^^xsd:string';
			}
			break;
		case "NamedNode":
			result = "<" + term.value + ">";
			break;
		case "BlankNode":
			result = "_:" + term.value;
			break;
		default:
			console.warn("Unknown term type: ", term.termType);
			result = "<" + term.value + ">";
	}
	return result;
}

// Export Singleton
export default new RDFGraph();
