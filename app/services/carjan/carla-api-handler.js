import $ from "jquery";

export default {
  async sendDataToCarla() {
    const apiUrl = "http://localhost:5000/carla-scenario";
    return new Promise((resolve, reject) => {
      $.ajax({
        url: apiUrl,
        method: "POST",
        contentType: "application/json",
        success(response) {
          resolve(response);
        },
        error(jqXHR, textStatus, errorThrown) {
          reject(
            new Error(
              `Error sending data to CARLA API: ${textStatus} - ${errorThrown}`
            )
          );
        },
      });
    });
  },
};
