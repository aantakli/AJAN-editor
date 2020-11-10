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
export default {
    "literals": [
        "\"Dispenser\"",
        "\"Schrank\"",
        "\"Angela\"^^xsd:string",
        "\"Start\""
    ],
    "predicate_uris": [
        "ajan:agentName",
        "ajan:agentInitKnowledge",
        "rdfs:domain",
        "ajan:agentTemplate",
        "rdfs:isDefinedBy",
        "rdf:object",
        "rdfs:subClassOf",
        "rdf:rest",
        "rdf:first",
        "rdfs:member",
        "rdf:subject",
        "rdfs:subPropertyOf",
        "rdfs:seeAlso",
        "rdf:type",
        "rdf:value",
        "rdfs:comment",
        "rdf:predicate",
        "rdfs:range",
        "rdfs:label"
    ],
    "predicate_uris_noprefix": [
        "<http://www.dfki.de/inversiv-ns#position>",
        "<http://www.dfki.de/inversiv-ns#locatedNextTo>",
        "<http://www.dfki.de/inversiv-ns#contains>"
    ],
    "resources": [
        "rdf:langString",
        "rdf:XMLLiteral",
        "rdf:HTML",
        "rdf:List",
        "rdfs:ContainerMembershipProperty",
        "rdfs:Container",
        "rdfs:Literal",
        "rdf:Seq",
        "rdfs:Datatype",
        "rdf:Bag",
        "rdf:PlainLiteral",
        "rdfs:Class",
        "rdf:Property",
        "ajan:AgentInitialisation",
        "rdf:nil",
        "rdfs:Resource",
        "rdf:Statement",
        "rdf:Alt"
    ],
    "resources_noprefix": [
        "<http://localhost:3030/inversiv/avatars/Natalie>",
        "<http://localhost:3030/inversiv/Bottom_Dispenser>",
        "<http://localhost:3030/inversiv/locations/Start>",
        "<http://localhost:8090/rdf4j/repositories/agents#TestAgent>",
        "<http://localhost:3030/inversiv/locations/Dispenser>",
        "<http://localhost:3030/inversiv/Message>",
        "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
        "<http://localhost:3030/inversiv/Unit>",
        "<http://www.dfki.de/inversiv-ns#LocationPosition>",
        "<http://localhost:3030/inversiv/locations/Schrank>",
        "<http://www.dfki.de/inversiv-ns#Avatar>",
        "<http://www.w3.org/2000/01/rdf-schema#>",
        "<http://www.dfki.de/inversiv-ns#Dispenser>"
    ]
}
