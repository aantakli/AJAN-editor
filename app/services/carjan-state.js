import Service from "@ember/service";
import { set } from "@ember/object";

export default Service.extend({
  mapData: null,
  agentData: null,

  setMapData(map) {
    set(this, "mapData", map);
  },

  setAgentData(agents) {
    set(this, "agentData", agents);
  },

  saveRequest() {
    set(this, "isSaveRequest", true);
    setTimeout(() => {
      set(this, "isSaveRequest", false);
    }, 100);
  },

  setUpdateStatements(rdfgraph) {
    set(this, "updateStatements", rdfgraph);
  },
});
