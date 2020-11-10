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
import {computed, observer} from "@ember/object";
import Component from "@ember/component";

export default Component.extend({
	templateManager: Ember.inject.service("data-manager/template-manager"),

	didInsertElement() {
		let dataPromise = this.templateManager.getAllDataPromise();
		dataPromise.then(data => {
			this.set("rawTemplates", data);
		});
	},

	templateID: computed("template", function() {
		console.log("templateID", this.get("template.id"))
		return this.get("template.id");
	}),

	templates: computed("nodeType", "rawTemplates", function() {
		if (!this.get("nodeType") || !this.get("rawTemplates")) return;
		let nodeType = this.get("nodeType");
		return getMatchingTemplates(this.get("rawTemplates"), nodeType);
	}),

	templateReset: observer("template", function() {
		let template = this.get("template");
		this.set("templateID", template ? template.id : "");
	}),

	actions: {
		changeTemplate(newTemplateId) {
			if (!newTemplateId) return;

			let template = getTemplateById(this.rawTemplates, newTemplateId);
			this.set("templateID", template ? template.id : "");
			this.set("template", template);
			if (this.onTemplateChange) this.onTemplateChange();
		}
	}
});

function getMatchingTemplates(rawTemplates, nodeType) {
	return rawTemplates.filter(template => {
		return (
			!nodeType ||
			template.get("nodesArray").some(type => type === "All" || type === nodeType)
		);
	});
}

function getTemplateById(rawTemplates, id) {
	return rawTemplates.find(template => {
		return template.get("id")=== id;
	});
}
