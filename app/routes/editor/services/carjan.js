import Ember from "ember";

export default Ember.Route.extend({
  model() {
    return {
      status: "All systems operational",
    };
  },
});
