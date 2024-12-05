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
  dboxes: [],
  dboxesWithColors: computed("dboxes.@each.color", function () {}),

  dboxesObserver: observer("carjanState.dboxes.@each", function () {
    this.set("dboxes", this.carjanState.dboxes);
    this.set(
      "dboxes",
      this.dboxes.map((dbox) => {
        const rgb = this.hexToRgb(dbox.color);
        const fill = this.rgbToRgba(this.lightenColor(rgb, 0.5), 0.8);
        const border = this.rgbToRgba(this.darkenColor(rgb, 0.5), 1);
        console.log("fill and border", fill, border);
        return {
          ...dbox,
          fillColor: fill,
          borderColor: border,
        };
      })
    );
    console.log("observed dboxes", this.dboxes);
  }),

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

  lightenColor(rgb, factor) {
    return rgb.map((c) => Math.min(255, c + Math.round((255 - c) * factor)));
  },

  darkenColor(rgb, factor) {
    return rgb.map((c) => Math.max(0, c - Math.round(c * factor)));
  },

  rgbToRgba(rgb, alpha) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  },

  rgbToHex(rgb) {
    return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  },

  markBoundingBoxCorners(dbox) {
    const minRow = parseInt(dbox.startX, 10);
    const maxRow = parseInt(dbox.endX, 10);
    const minCol = parseInt(dbox.startY, 10);
    const maxCol = parseInt(dbox.endY, 10);
    const color = dbox.color ? dbox.color : "#FF0000";

    const gridCells = document.querySelectorAll("#gridContainer .grid-cell");

    if (gridCells.length === 0) {
      console.error(
        "No grid cells found. Check if the grid is rendered and the selector is correct."
      );
      return;
    }

    const canvas = document.getElementById("drawingCanvas");
    const context = canvas.getContext("2d");

    // Canvas clear (optional)
    context.clearRect(0, 0, canvas.width, canvas.height);

    let topLeft = null;
    let topRight = null;
    let bottomLeft = null;
    let bottomRight = null;
    // Finde die äußersten Zellen in der Bounding Box
    gridCells.forEach((cell) => {
      const row = parseInt(cell.getAttribute("data-row"), 10);
      const col = parseInt(cell.getAttribute("data-col"), 10);
      const rect = cell.getBoundingClientRect();

      // Top-left corner
      if (row === minRow && col === minCol) {
        topLeft = {
          x: rect.left - canvas.getBoundingClientRect().left,
          y: rect.top - canvas.getBoundingClientRect().top,
        };
      }

      // Top-right corner
      if (row === minRow && col === maxCol) {
        topRight = {
          x: rect.right - canvas.getBoundingClientRect().left,
          y: rect.top - canvas.getBoundingClientRect().top,
        };
      }

      // Bottom-left corner
      if (row === maxRow && col === minCol) {
        bottomLeft = {
          x: rect.left - canvas.getBoundingClientRect().left,
          y: rect.bottom - canvas.getBoundingClientRect().top,
        };
      }

      // Bottom-right corner
      if (row === maxRow && col === maxCol) {
        bottomRight = {
          x: rect.right - canvas.getBoundingClientRect().left,
          y: rect.bottom - canvas.getBoundingClientRect().top,
        };
      }
    });

    const corners = [topLeft, topRight, bottomLeft, bottomRight].filter(
      Boolean
    );

    // Zeichne das Rechteck basierend auf den berechneten Ecken
    if (corners.length === 4) {
      const rectX = topLeft.x;
      const rectY = topLeft.y;
      const rectWidth = topRight.x - topLeft.x;
      const rectHeight = bottomLeft.y - topLeft.y;

      const rgb = this.hexToRgb(color);

      const fillColor = this.lightenColor(rgb, 0.5);
      const borderColor = this.darkenColor(rgb, 0.5);

      context.fillStyle = this.rgbToRgba(fillColor, 0.5); // Transparente Füllung
      context.strokeStyle = this.rgbToRgba(borderColor, 1); // Border-Farbe
      context.lineWidth = 2;

      // Vorschau-Element finden
      const previewElement = document.querySelector(".decision-box-preview");

      if (previewElement) {
        // Setze dynamische Farben
        previewElement.style.backgroundColor = this.rgbToRgba(fillColor, 0.8);
        previewElement.style.border = `2px solid ${this.rgbToRgba(
          borderColor,
          1
        )}`;
      }

      context.fillRect(rectX, rectY, rectWidth, rectHeight);
      context.strokeRect(rectX, rectY, rectWidth, rectHeight);
    } else {
      console.error("Could not determine all corners of the bounding box.");
    }
  },

  hexToRgb(hex) {
    return [
      parseInt(hex.substring(1, 3), 16),
      parseInt(hex.substring(3, 5), 16),
      parseInt(hex.substring(5, 7), 16),
    ];
  },

  actions: {
    openDecisionBoxEditor(dbox) {
      this.carjanState.setSelectedDBox(dbox);
      this.markBoundingBoxCorners(dbox);
      this.carjanState.set("properties", "dbox");
    },

    startNewDecisionBox() {
      this.carjanState.setSelectedDBox(null);
      this.carjanState.set("canvasMode", "dbox");
    },

    deleteDecisionBox(index) {
      const updatedDBoxes = [...this.carjanState.dboxes];
      updatedDBoxes.splice(index, 1);
      this.carjanState.set("dboxes", updatedDBoxes);
    },

    resetCanvasMode() {
      this.carjanState.set("canvasMode", "default");
    },

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

      this.carjanState.set("properties", "scenario");
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
