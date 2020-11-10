/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli (German Research Center for Artificial Intelligence, DFKI).
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
import Ember from "ember";
//import Base from 'semantic-ui-ember/mixins/base';

export default Ember.Route.extend({
	model() {
		return [
			{
				id: "turing",
				name: "Agent Turing",
				baseURI: "http://localhost:8090/rdf4j/repositories/agents#Turing",
				behavior: ["HumanBehavior", "StandardBehavior"],
				description:
					"A classic, stylish agent, trying to blend in with humanity. And no, he hasn't passed the Turing Test... yet"
			},
			{
				id: "anna",
				name: "Agent Anna",
				baseURI: "http://localhost:8090/rdf4j/repositories/agents#Anna",
				behavior: "ErraticBehavior",
				description: "The new girl on the block. She is kind of nervous"
			}
		];
	},

	actions: {
		edit() {}
	}
});
