import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { next } from "@ember/runloop";
import { computed, observer } from "@ember/object";
import { htmlSafe } from "@ember/string";

export default Component.extend({
  carjanState: service(),
  waypoints: null,
  paths: [],
  safeColorStyle: computed("path.color", function () {
    return htmlSafe(`color: ${this.get("path.color")};`);
  }),
  placeholderOptions: [
    "Where no waypoint has gone before...",
    "A scenic route full of detours and surprises!",
    "The quick brown path jumps over lazy obstacles",
    "Straight to the point... or is it?",
    "A shortcut through scenic chaos",
    "Zigzags for added excitement",
    "Taking the long way home",
    "Warning: Detours ahead",
    "Path to enlightenment... or confusion",
    "Choose wisely: every step counts",
    "More twists than a thriller novel",
    "Leading you to adventure, maybe",
    "Where the waypoint winds take you",
    "Charting unknown territories",
    "Plotting a course for discovery",
    "Stay on track... if you dare",
    "The journey is half the fun",
    "Detour: Unexpected sights ahead",
    "Winding roads and hidden trails",
    "Path of twists and turns",
    "A breadcrumb trail for the bold",
    "Step into the unknown",
    "Adventure lies around each turn",
  ],

  placeholderText: "",
  pathDescription: "",
  waypointColor: "red",

  pathsWithWaypoints: computed("paths.@each.waypoints", function () {
    return this.paths.map((path) => {
      return {
        ...path,
        firstTwoWaypoints: path.waypoints.slice(0, 2),
        hasMoreThanTwoWaypoints: path.waypoints.length > 2,
      };
    });
  }),

  waypointPathList: computed(
    "waypoints.@each",
    "paths.@each.waypoints",
    function () {
      // Sicherstellen, dass `waypoints` und `paths` initialisiert sind
      const waypoints = this.waypoints || [];
      const paths = this.paths || [];

      return waypoints.map((waypoint) => {
        const associatedPaths = paths.filter((path) =>
          path.waypoints.some((wp) => wp.waypoint === waypoint.waypoint)
        );

        return {
          ...waypoint,
          paths: associatedPaths,
        };
      });
    }
  ),

  pathObserver: observer("carjanState.paths.@each.waypoints", function () {
    const paths = this.carjanState.paths || [];
    this.set(
      "pathsWithWaypoints",
      paths.map((path) => ({
        ...path,
        firstTwoWaypoints: path.waypoints.slice(0, 2),
        hasMoreThanTwoWaypoints: path.waypoints.length > 2,
      }))
    );
    const selectedPath = this.carjanState.selectedPath;
    if (!selectedPath) return;
    setTimeout(() => {
      const newPath = paths.find((path) => path.path === selectedPath.path);
      if (!newPath) {
        this.carjanState.set("properties", "scenario");
        return;
      }
      this.carjanState.set("properties", "path");
      this.carjanState.setSelectedPath(newPath);
    }, 50);
  }),

  async init() {
    this._super(...arguments);
    this.setRandomPlaceholder();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const waypoints = this.carjanState.waypoints || [];
    const trimmedWaypoints = (waypoints || []).map((waypoint) => ({
      ...waypoint,
      waypointId: waypoint.waypoint.split("#")[1] || waypoint.waypoint,
    }));

    const paths = this.carjanState.paths || [];
    const trimmedPaths = (paths || []).map((path) => ({
      ...path,
      waypoints: path.waypoints.map((wp) => ({
        ...wp,
        waypointId: wp.waypoint.split("#")[1] || wp.waypoint,
      })),
    }));

    this.set("waypoints", trimmedWaypoints);
    this.set("paths", trimmedPaths);

    this.setupTabs();
  },

  setRandomPlaceholder() {
    const options = this.placeholderOptions;
    const randomIndex = Math.floor(Math.random() * options.length);
    this.set("placeholderText", options[randomIndex]);
  },

  isWaypointInPath: (waypoint, path) =>
    path.waypoints.some((wp) => wp.waypoint === waypoint.waypoint),

  actions: {
    setWaypointHighlightColor(waypoint, path) {
      const iconElement = document.querySelector(
        `[data-x="${waypoint.x}"][data-y="${waypoint.y}"][data-position-in-cell="${waypoint.positionInCell}"]`
      );
      if (iconElement) {
        // Speichern der ursprünglichen Eigenschaften
        waypoint.originalStyle = {
          color: iconElement.style.color,
          transform: iconElement.style.transform,
          textShadow: iconElement.style.textShadow,
        };

        let color = "#FEFEFE";
        if (path) {
          color = path.color;
        }

        iconElement.style.transition =
          "transform 0.5s ease, color 0.2s ease, textshadow 0.2 ease";
        iconElement.style.color = color;
        iconElement.style.transform = "scale(1.8)";
        iconElement.style.textShadow = "0 0 3px black";
      }
    },
    clearWaypointHighlightColor(waypoint) {
      const iconElement = document.querySelector(
        `[data-x="${waypoint.x}"][data-y="${waypoint.y}"][data-position-in-cell="${waypoint.positionInCell}"]`
      );
      if (iconElement && waypoint.originalStyle) {
        // Wiederherstellen der ursprünglichen Eigenschaften
        iconElement.style.transition =
          "transform 0.5s ease, color 0.2s ease, textshadow 0.2 ease";
        iconElement.style.color = waypoint.originalStyle.color;
        iconElement.style.transform = waypoint.originalStyle.transform;
        iconElement.style.textShadow = waypoint.originalStyle.textShadow;
      }
    },
    openPathwayEditor(path) {
      this.carjanState.setSelectedPath(path);
      this.carjanState.set("properties", "path");
    },

    clearPath() {
      const mainElement = document.getElementById("main");
      mainElement.innerHTML = "";
    },

    closePathwayEditor() {
      this.carjanState.set("properties", "scenario");
    },

    openWaypointEditor(x, y, positionInCell) {
      console.log("openWaypointEditor", x, y);
      let filteredWaypoints = this.waypoints.filter(
        (wp) => wp.x === x && wp.y === y
      );
      let cellStatus = {
        ocucpied: false,
        entityType: null,
        waypoints: filteredWaypoints,
      };
      this.carjanState.set("currentCellPosition", [x, y]);
      this.carjanState.set("currentCellStatus", cellStatus);
      this.carjanState.set("properties", "waypoint");
    },

    async openNewPathDialog() {
      this.setRandomPlaceholder();
      this.set("isDialogOpen", true);
      this.set("pathName", "");
      this.set("hasError", false);

      next(() => {
        this.$(".ui.basic.modal")
          .modal({
            closable: false,
            transition: "scale",
            duration: 500,
            dimmerSettings: { duration: { show: 500, hide: 500 } },
          })
          .modal("show");
      });
    },

    closeNewPathDialog() {
      this.$(".ui.modal").modal("hide");
      this.set("isDialogOpen", false);
      this.set("pathName", "");
      this.set("hasError", false);
    },

    generateNewPath() {
      const existingPaths = this.carjanState.paths;

      const pathNumbers = existingPaths
        .map((path) => {
          const match = path.path.match(/Path(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => !isNaN(num));

      const highestIndex = pathNumbers.length ? Math.max(...pathNumbers) : 0;
      const newPathNumber = highestIndex + 1;

      const newPathURI = `http://example.com/carla-scenario#Path${newPathNumber}`;
      const newPath = {
        path: newPathURI,
        waypoints: [],
        description: this.pathDescription || "New path description",
      };

      this.carjanState.appendPath(newPath);

      setTimeout(() => {
        this.carjanState.saveRequest();
      }, 300);
    },

    checkPathName() {
      const pathDescription = this.pathDescription.trim();

      const isDescriptionEmpty = pathDescription === "";
      this.set("isDescriptionEmpty", isDescriptionEmpty);

      if (isDescriptionEmpty) {
        this.set("hasError", false);
        this.set("errorMessage", "");
        return;
      }

      const isValidDescription = /^[a-zA-Z0-9_ ]+$/.test(pathDescription);
      if (!isValidDescription) {
        this.set("hasError", true);
        this.set(
          "errorMessage",
          "Invalid path description. Only letters, numbers, spaces, and underscores are allowed."
        );
        return;
      }

      const paths = this.carjanState.paths || [];
      const isDuplicateDescription = paths.some(
        (path) => path.description.trim() === pathDescription
      );

      if (isDuplicateDescription) {
        this.set("hasError", true);
        this.set(
          "errorMessage",
          "Duplicate path description found. Please use a unique description."
        );
        return;
      }

      this.set("hasError", false);
      this.set("errorMessage", "");
    },

    removeOverlay() {
      this.carjanState.setPath(false);
    },

    dragStart(event) {
      const waypointType = event.currentTarget.dataset.waypointType;
      event.dataTransfer.setData("text", waypointType);

      const dragIcon = this.element.querySelector("#map-pin-icon");

      if (dragIcon) {
        dragIcon.style.width = "12px";
        dragIcon.style.height = "12px";
        dragIcon.style.display = "inline-block";

        event.dataTransfer.setDragImage(dragIcon, 24, 24);
      }

      event.stopPropagation();
    },

    dragLeave(event) {
      event.target.classList.remove("cell-hover-allowed");
      event.target.classList.remove("cell-hover-not-allowed");
      event.target.style.cursor = "move";
    },

    addPath() {
      this.carjanState.setPath(true);
      const newPath = {
        name: `Path ${this.paths.length + 1}`,
        description: "New path description",
        waypoints: [],
      };
      this.paths.pushObject(newPath);
      this.carjanState.set("paths", this.paths);
    },
  },

  didRender() {
    this._super(...arguments);

    // Überprüfe, ob alle Pfade geladen sind und der DOM bereit ist
    Ember.run.scheduleOnce("afterRender", this, function () {
      const paths = this.carjanState.paths;
      if (paths) {
        this.carjanState.paths.forEach((path) => {
          this.setTriangleColor(path);
        });
      }
    });
  },

  setTriangleColor(path) {
    const triangleElement = document.getElementById(path.path);
    if (triangleElement) {
      triangleElement.style.setProperty("--triangle-color", path.color);
    }
  },
  setupTabs() {
    $(document).ready(function () {
      $(".menu .item").tab();
    });
  },
});
