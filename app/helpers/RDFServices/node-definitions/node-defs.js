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
class nodeDefs {
	constructor() {
		this.nodeDefs = [];
	}

	reset() {
		this.nodeDefs = [];
	}

	set(newData) {
		this.nodeDefs = newData;
	}

	get() {
		return this.nodeDefs;
	}

	push(nodeDef) {
		this.nodeDefs.push(nodeDef);
	}

	forEach(call) {
		this.nodeDefs.forEach(call);
	}

	getStyle() {
		let styleArray = [];
		this.nodeDefs.forEach(node => {
			styleArray.push(node.style);
		});
		return styleArray;
	}

	getTypeDef(type) {
		return (
			this.nodeDefs.find(ele => {
				return ele.id === type;
			}) || console.error("Unknown node type:", type)
		);
	}

	getMetaData(name, cat) {
		let ndClass = cat === "composite" || cat === "decorator" ? name : cat;
		let type;
		this.nodeDefs.find(ele => {
			if (ele.id.toLowerCase() === ndClass.toLowerCase()) {
				// ele.type is a URI
				type = ele.id;
				ndClass = ele.class;
				return true;
			}
			return false;
		});

		//TODO: Adjust for Decorators

		return {
			type: type,
			class: ndClass
		};
	}

	childCount(type) {
		let def = this.nodeDefs.find(ele => {
			return ele.type === type;
		});
		switch (def["class"]) {
			case "Decorator":
				return 1;
			case "Root":
				return 1;
			case "Composite":
				return 2;
			case "Leaf":
				return 0;
			default:
				return NaN;
		}
	}

	match(typeURI) {
		let match = this.nodeDefs.find(ele => {
			return ele.type === typeURI;
		});
		//console.log(typeURI, match);
		return match;
	}
}

export default new nodeDefs();
