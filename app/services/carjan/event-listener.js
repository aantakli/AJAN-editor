export default {
  listen(callback) {
    document.addEventListener("customEditorEvent", (event) => {
      const eventData = event.detail;
      callback(eventData);
    });
  },
};
