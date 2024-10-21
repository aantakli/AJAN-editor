import Component from "@ember/component";

export default Component.extend({
  entities: null,

  async init() {
    this._super(...arguments);
    await this.loadEntities();
  },

  async loadEntities() {
    try {
      const response = await fetch("/assets/carjan/entities.json");
      const entities = await response.json();
      this.set("entities", entities);
    } catch (error) {
      console.error("Error loading entities:", error);
    }
  },

  actions: {
    onMouseDown(event) {
      const entityType = event.currentTarget.dataset.entityType;

      const iconMap = {
        pedestrian: "user",
        vehicle: "car",
        autonomous: "taxi",
        obstacle: "tree",
        default: "map marker alternate",
      };

      const iconClass = iconMap[entityType] || iconMap.default;

      // Neues Element erstellen
      const newElement = document.createElement("i");
      newElement.classList.add("icon", iconClass);
      newElement.style.position = "absolute";
      newElement.style.fontSize = "48px";
      newElement.style.left = `${event.pageX - 24}px`;
      newElement.style.top = `${event.pageY - 24}px`;
      newElement.style.pointerEvents = "none"; // Verhindert, dass es das Mouse-Event stört
      newElement.style.backgroundColor = "transparent"; // Hintergrund transparent machen
      newElement.style.border = "none"; // Falls ein Border hinzugefügt wird, entfernen
      document.body.appendChild(newElement);

      // Bewege das Element mit der Maus
      const onMouseMove = (e) => {
        newElement.style.left = `${e.pageX - 24}px`;
        newElement.style.top = `${e.pageY - 24}px`;
      };

      // Entferne das Element, wenn die Maus losgelassen wird
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.removeChild(newElement);
      };

      // Füge die Event-Listener hinzu
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);

      // Stoppe die Standard-Drag-Operation, um das Element sofort bewegbar zu machen
      event.preventDefault();
    },
  },
});
