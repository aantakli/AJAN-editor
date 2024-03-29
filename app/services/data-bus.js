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

export default Ember.Service.extend(Ember.Evented, {
  unsavedChanges() {
    this.trigger('unsavedChanges');
  },

  createBT() {
    this.trigger('createBT');
  },

  generateAgent() {
    this.trigger('generateAgent');
  },

  cloneBT(label) {
    this.trigger('cloneBT');
  },

  importBT() {
    this.trigger('importBT');
  },

  exportBT() {
    this.trigger('exportBT');
  },

  saveExportedBT(bt) {
    this.trigger('saveExportedBT', bt);
  },

  deleteBTModal() {
    this.trigger('deleteBTModal');
  },

  deleteBT() {
    this.trigger('deleteBT');
  },

  addBT(bt) {
      this.trigger('addBT', bt);
  },

  save(content) {
    this.trigger('save', content);
  },

  updatedBT() {
    this.trigger('updatedBT');
  },

  updatedSG() {
    this.trigger('updatedSG');
  },

  deletedSG() {
    this.trigger('deletedSG');
  },

  updatedAG() {
    this.trigger('updatedAG');
  },

  createAI(data) {
    this.trigger('createAI', data);
  },

  deletedAI() {
    this.trigger('deletedAI');
  },

  updateAgentDefs(defs) {
    this.trigger('updateAgentDefs', defs);
  },

  updateDomain(editor, repo) {
    this.trigger('updateDomain', editor, repo);
  },

  noUpdateDomain() {
    this.trigger('noUpdateDomain');
  }
});
