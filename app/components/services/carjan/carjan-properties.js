import Component from "@ember/component";
import { inject as service } from "@ember/service";

export default Component.extend({
  ajax: service(),
  store: service(),
  carjanState: service(),

  actions: {
    setWeather(event) {
      const selectedWeather = event.target.value;
      this.carjanState.setWeather(selectedWeather);
    },

    setCameraPosition(event) {
      const selectedCameraPosition = event.target.value;
      this.carjanState.setCameraPosition(selectedCameraPosition);
    },

    setCategory(event) {
      const selectedCategory = event.target.value;
      this.carjanState.setCategory(selectedCategory);
    },
  },

  didInsertElement() {
    this._super(...arguments);
    this.$(".ui.dropdown").dropdown();
  },
});
