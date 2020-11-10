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
import Component from "@ember/component";
import {observer} from "@ember/object";
import {Vocabulary} from "ajan-editor/objects/definitions/vocabulary";

export default Component.extend({
	vocabularyManager: Ember.inject.service("data-manager/vocabulary-manager"),
	oldUri: undefined,

	onShow: observer("show", function() {
		if (!this.show) return;

		if (!this.get("activeRow")) this.set("oldUri", undefined);
		else this.set("oldUri", this.get("vocabulary.storageUri"));
	}),

	actions: {
		onConfirm() {
			let vocabulary = this.get("vocabulary");
			let activeRow = this.get("activeRow");
			let table = this.get("table");

			if (!activeRow) {
				table.addRow({
					Prefix: vocabulary.id,
					URI: vocabulary.uri,
					Description: vocabulary.description
				});
				this.vocabularyManager.save(vocabulary);
			} else {
				activeRow.set("Prefix", vocabulary.id);
				activeRow.set("URI", vocabulary.uri);
				activeRow.set("Description", vocabulary.description);
				this.vocabularyManager.replace(this.oldUri, vocabulary);
			}

			resetVocabulary(this);
			return true;
		},

		onCancel() {
			resetVocabulary(this);
		}
	}
});

function resetVocabulary(that) {
	that.set("vocabulary", Vocabulary.create());
	that.get("activeRow", undefined);
}
