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
let ND = {
	defaultPrefix: "http://www.ajan.de/behavior/nd-ns#",
	type: "http://www.ajan.de/behavior/nd-ns#type",
  class: "http://www.ajan.de/behavior/nd-ns#class",
  category: "http://www.ajan.de/behavior/nd-ns#category",
	Leaf: "http://www.ajan.de/behavior/nd-ns#Leaf",
	Composite: "http://www.ajan.de/behavior/nd-ns#Composite",
	Decorator: "http://www.ajan.de/behavior/nd-ns#Decorator",
	BehaviorTree: "http://www.ajan.de/behavior/nd-ns#BehaviorTree",
	Root: "http://www.ajan.de/behavior/nd-ns#Root",
	name: "http://www.ajan.de/behavior/nd-ns#name",
	style: "http://www.ajan.de/behavior/nd-ns#style",
	labelType: "http://www.ajan.de/behavior/nd-ns#labelType",
	Dynamic: "http://www.ajan.de/behavior/nd-ns#Dynamic",
	Fixed: "http://www.ajan.de/behavior/nd-ns#Fixed",
	color: "http://www.ajan.de/behavior/nd-ns#color",
	labelColor: "http://www.ajan.de/behavior/nd-ns#labelColor",
	padding: "http://www.ajan.de/behavior/nd-ns#padding",
	paddingTo: "http://www.ajan.de/behavior/nd-ns#paddingTo",
	shape: "http://www.ajan.de/behavior/nd-ns#shape",
  polygon: "http://www.ajan.de/behavior/nd-ns#polygon",
  toggle: "http://www.ajan.de/behavior/nd-ns#toggle",
  first: "http://www.ajan.de/behavior/nd-ns#first",
  First: "http://www.ajan.de/behavior/nd-ns#First",
  last: "http://www.ajan.de/behavior/nd-ns#last",
  Last: "http://www.ajan.de/behavior/nd-ns#Last",
	list: "http://www.ajan.de/behavior/nd-ns#list",
	parameter: "http://www.ajan.de/behavior/nd-ns#parameter",
	parameterSet: "http://www.ajan.de/behavior/nd-ns#parameterSet",
	parameters: "http://www.ajan.de/behavior/nd-ns#parameters",
	mapsTo: "http://www.ajan.de/behavior/nd-ns#mapsTo",
	input: "http://www.ajan.de/behavior/nd-ns#input",
  title: "http://www.ajan.de/behavior/nd-ns#title",
  Toggle: "http://www.ajan.de/behavior/nd-ns#Toggle",
  Parameter: "http://www.ajan.de/behavior/nd-ns#Parameter",
  ParameterSet: "http://www.ajan.de/behavior/nd-ns#ParameterSet",
	List: "http://www.ajan.de/behavior/nd-ns#List",
  Query: "http://www.ajan.de/behavior/nd-ns#Query",
  ACTNDef: "http://www.ajan.de/behavior/nd-ns#ACTNDef",
  Repo: "http://www.ajan.de/behavior/nd-ns#Repo",
  Event: "http://www.ajan.de/behavior/nd-ns#Event",
  Goal: "http://www.ajan.de/behavior/nd-ns#Goal",
  EventGoal: "http://www.ajan.de/behavior/nd-ns#EventGoal",
	StyleDef: "http://www.ajan.de/behavior/nd-ns#StyleDef",
	default: "http://www.ajan.de/behavior/nd-ns#default",
  icon: "http://www.ajan.de/behavior/nd-ns#icon",
  textarea: "http://www.ajan.de/behavior/nd-ns#textarea",
  optional: "http://www.ajan.de/behavior/nd-ns#optional"
};
let RDFS = {
	defaultPrefix: "http://www.w3.org/2000/01/rdf-schema#",
	label: "http://www.w3.org/2000/01/rdf-schema#label",
	comment: "http://www.w3.org/2000/01/rdf-schema#comment",
  Resource: "http://www.w3.org/2000/01/rdf-schema#Resource",
  isDefinedBy: "http://www.w3.org/2000/01/rdf-schema#isDefinedBy"
};
let RDF = {
	defaultPrefix: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	first: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
	rest: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
	nil: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
	type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
	List: "http://www.w3.org/1999/02/22-rdf-syntax-ns#List"
};
let DCT = {
  defaultPrefix: "http://purl.org/dc/terms/",
  description: "http://purl.org/dc/terms/description",
  requires: "http://purl.org/dc/terms/requires"
};
let STRIPS = {
	defaultPrefix: "http://www.ajan.de/behavior/strips-ns#",
	config: "http://www.ajan.de/behavior/strips-ns#config",
	allSolutions: "http://www.ajan.de/behavior/strips-ns#allSolutions",
	initStates: "http://www.ajan.de/behavior/strips-ns#initStates",
	goalStates: "http://www.ajan.de/behavior/strips-ns#goalStates"
};
let XSD = {
	defaultPrefix: "http://www.w3.org/2001/XMLSchema#",
	double: "http://www.w3.org/2001/XMLSchema#double",
	float: "http://www.w3.org/2001/XMLSchema#float",
	string: "http://www.w3.org/2001/XMLSchema#string",
	anyURI: "http://www.w3.org/2001/XMLSchema#anyURI",
	long: "http://www.w3.org/2001/XMLSchema#long",
  int: "http://www.w3.org/2001/XMLSchema#int",
  integer: "http://www.w3.org/2001/XMLSchema#integer",
  boolean: "http://www.w3.org/2001/XMLSchema#boolean",
  dateTime: "http://www.w3.org/2001/XMLSchema#dateTime"
};
let BT = {
	defaultPrefix: "http://www.ajan.de/behavior/bt-ns#",
	child: "http://www.ajan.de/behavior/bt-ns#hasChild",
	hasChild: "http://www.ajan.de/behavior/bt-ns#hasChild",
	children: "http://www.ajan.de/behavior/bt-ns#hasChildren",
	hasChildren: "http://www.ajan.de/behavior/bt-ns#hasChildren",
	root: "http://www.ajan.de/behavior/bt-ns#Root",
	Root: "http://www.ajan.de/behavior/bt-ns#Root",
	beliefBase: "http://www.ajan.de/behavior/bt-ns#beliefBase",
	originBase: "http://www.ajan.de/behavior/bt-ns#originBase",
	targetBase: "http://www.ajan.de/behavior/bt-ns#targetBase",
	sparql: "http://www.ajan.de/behavior/bt-ns#sparql",
  Query: "http://www.ajan.de/behavior/bt-ns#Query",
  AskQuery: "http://www.ajan.de/behavior/bt-ns#AskQuery",
  ConstructQuery: "http://www.ajan.de/behavior/bt-ns#ConstructQuery",
  SelectQuery: "http://www.ajan.de/behavior/bt-ns#SelectQuery",
  UpdateQuery: "http://www.ajan.de/behavior/bt-ns#UpdateQuery",
	queryTemplate: "http://www.ajan.de/behavior/bt-ns#queryTemplate",
	queryTemplateDefaultQuery: "http://www.ajan.de/behavior/bt-ns#queryTemplateDefaultQuery",
  BehaviorTree: "http://www.ajan.de/behavior/bt-ns#BehaviorTree",
  Report: "http://www.ajan.de/behavior/bt-ns#Report",
  debugging: "http://www.ajan.de/behavior/bt-ns#debugging",
  btNode: "http://www.ajan.de/behavior/bt-ns#btNode",
  state: "http://www.ajan.de/behavior/bt-ns#state",
  definition: "http://www.ajan.de/behavior/bt-ns#definition"
};
let EDITOR = {
	defaultPrefix: "http://www.ajan.de/behavior/editor-ns#",
	item: "http://www.ajan.de/behavior/editor-ns#item",
	id: "http://www.ajan.de/behavior/editor-ns#id",
	snippet: "http://www.ajan.de/behavior/editor-ns#snippet",
	vocabulary: "http://www.ajan.de/behavior/editor-ns#vocabulary",
	uri: "http://www.ajan.de/behavior/editor-ns#uri",
	template: "http://www.ajan.de/behavior/editor-ns#template",
	nodes: "http://www.ajan.de/behavior/editor-ns#nodes",
	targetBase: "http://www.ajan.de/behavior/editor-ns#targetBase",
	queryVariables: "http://www.ajan.de/behavior/editor-ns#queryVariables",
	parameters: "http://www.ajan.de/behavior/editor-ns#parameters",
	query: "http://www.ajan.de/behavior/editor-ns#query",
	sparqlQuery: "http://www.ajan.de/behavior/editor-ns#sparqlQuery",
	content: "http://www.ajan.de/behavior/editor-ns#content",
	tags: "http://www.ajan.de/behavior/editor-ns#tags",
	modified: "http://www.ajan.de/behavior/editor-ns#modified",
	shorthand: "http://www.ajan.de/behavior/editor-ns#shorthand",
	replacement: "http://www.ajan.de/behavior/editor-ns#replacement"
};
let ACTN = {
	defaultPrefix: "http://www.ajan.de/actn#",
	ServiceAction: "http://www.ajan.de/actn#ServiceAction",
	PluginAction: "http://www.ajan.de/actn#PluginAction",
	Asynchronous: "http://www.ajan.de/actn#Asynchronous",
	ActionVariable: "http://www.ajan.de/actn#ActionVariable",
	Synchronous: "http://www.ajan.de/actn#Synchronous",
	Consumable: "http://www.ajan.de/actn#Consumable",
	Producible: "http://www.ajan.de/actn#Producible",
	Binding: "http://www.ajan.de/actn#Binding",
	Payload: "http://www.ajan.de/actn#Payload",
	communication: "http://www.ajan.de/actn#communication",
	runBinding: "http://www.ajan.de/actn#runBinding",
	abortBinding: "http://www.ajan.de/actn#abortBinding",
	variables: "http://www.ajan.de/actn#variables",
	sparql: "http://www.ajan.de/actn#sparql",
	consumes: "http://www.ajan.de/actn#consumes",
  produces: "http://www.ajan.de/actn#produces",
  action: "http://www.ajan.de/actn#action",
  headers: "http://www.ajan.de/actn#headers"
};
let HTTP = {
	Request: "http://www.w3.org/2006/http#Request",
	version: "http://www.w3.org/2006/http#httpVersion",
  Header: "http://www.w3.org/2006/http#Header",
  headers: "http://www.w3.org/2006/http#headers",
  hdrName: "http://www.w3.org/2006/http#hdrName",
  accept: "http://www.w3.org/2008/http-headers#accept",
  contentType: "http://www.w3.org/2008/http-headers#content-type",
  fieldValue: "http://www.w3.org/2006/http#fieldValue",
  mthd: "http://www.w3.org/2006/http#mthd",
	uri: "http://www.w3.org/2006/http#requestURI",
	body: "http://www.w3.org/2006/http#body",
	Get: "http://www.w3.org/2008/http-methods#GET",
	Post: "http://www.w3.org/2008/http-methods#POST",
	Put: "http://www.w3.org/2008/http-methods#PUT",
	Patch: "http://www.w3.org/2008/http-methods#PATCH",
	Delete: "http://www.w3.org/2008/http-methods#DELETE",
	Copy: "http://www.w3.org/2008/http-methods#COPY",
	Head: "http://www.w3.org/2008/http-methods#HEAD",
	Options: "http://www.w3.org/2008/http-methods#OPTIONS",
	Link: "http://www.w3.org/2008/http-methods#LINK",
	Unlink: "http://www.w3.org/2008/http-methods#UNLINK",
	Purge: "http://www.w3.org/2008/http-methods#PURGE",
	Lock: "http://www.w3.org/2008/http-methods#LOCK",
	Unlock: "http://www.w3.org/2008/http-methods#UNLOCK",
	Propfind: "http://www.w3.org/2008/http-methods#PROPFIND",
	View: "http://www.w3.org/2008/http-methods#VIEW",
	paramValue: "http://www.w3.org/2011/http#paramValue"
};
let SPIN = {
	varName: "http://spinrdf.org/sp#varName"
};
let AGENTS = {
  Agent: "http://www.ajan.de/ajan-ns#Agent",
  agent: "http://www.ajan.de/ajan-ns#agent",
  Event: "http://www.ajan.de/ajan-ns#ModelEvent",
  QueueEvent: "http://www.ajan.de/ajan-ns#ModelQueueEvent",
  MappingEvent: "http://www.ajan.de/ajan-ns#MappingEvent",
  Endpoint: "http://www.ajan.de/ajan-ns#Endpoint",
  InitialBehavior: "http://www.ajan.de/ajan-ns#InitialBehavior",
  FinalBehavior: "http://www.ajan.de/ajan-ns#FinalBehavior",
	Behavior:"http://www.ajan.de/ajan-ns#Behavior",
	AgentTemplate:"http://www.ajan.de/ajan-ns#AgentTemplate",
  Goal: "http://www.ajan.de/ajan-ns#Goal",
  Variable: "http://www.ajan.de/ajan-ns#Variable",
  event: "http://www.ajan.de/ajan-ns#event",
  goal: "http://www.ajan.de/ajan-ns#goal",
  agentKnowledge: "http://www.ajan.de/ajan-ns#agentKnowledge",
  initKnowledge: "http://www.ajan.de/ajan-ns#agentInitKnowledge",
  endpoint: "http://www.ajan.de/ajan-ns#endpoint",
  initialBehavior: "http://www.ajan.de/ajan-ns#initialBehavior",
  finalBehavior: "http://www.ajan.de/ajan-ns#finalBehavior",
  behavior: "http://www.ajan.de/ajan-ns#behavior",
  agentTemplate: "http://www.ajan.de/ajan-ns#agentTemplate",
  agentId: "http://www.ajan.de/ajan-ns#agentId",
	trigger: "http://www.ajan.de/ajan-ns#trigger",
	bt: "http://www.ajan.de/ajan-ns#bt",
	variables: "http://www.ajan.de/ajan-ns#variables",
	dataType:"http://www.ajan.de/ajan-ns#dataType",
  capability: "http://www.ajan.de/ajan-ns#capability",
  clearEKB: "http://www.ajan.de/ajan-ns#clearEKB"
};

export {BT, EDITOR, ACTN, ND, RDF, RDFS, DCT, STRIPS, XSD, HTTP, SPIN, AGENTS};
