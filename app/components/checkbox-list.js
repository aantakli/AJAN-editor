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
import Ember from 'ember';

const { Component } = Ember;

export default Component.extend({
  init() {
    this._super(...arguments);
    this.set('checkedItemsSet', new Set(this.get('checked') || []));

  },
  actions: {
    onCheck(item) {
      let checkedItemsSet = this.get('checkedItemsSet');


       let checkedItemsArray = Array.from(checkedItemsSet);



       let checkedItemsArraylabel = [];
       for (var i = 0; i < checkedItemsArray.length; i++) {

         checkedItemsArraylabel[i]=checkedItemsArray[i].label;


       }
       // back to set
      let checkedItemsSetlabel = new Set();
       checkedItemsArraylabel.forEach(item => checkedItemsSetlabel.add(item));

      if (checkedItemsSetlabel.has(item.label)) {
          // li mao huan taizi
        for (var i = 0; i < checkedItemsArray.length; i++) {
          if(checkedItemsArray[i].label==item.label) {
            checkedItemsSet.delete(checkedItemsArray[i]);
            checkedItemsSet.add(item);
            delete checkedItemsArray[i];
          }
       }

        checkedItemsSet.delete(item);
        console.log('hhhhh11111');

      } else {
        checkedItemsSet.add(item);
        console.log('hhhhh2222');
      }
      console.log("2222222222");
      console.log(checkedItemsSet);
      this.get('onCheck')(Array.from(checkedItemsSet));
    }
  }
});
