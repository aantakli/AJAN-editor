import $ from "jquery";

export default {
  async sendDataToCarla(scenarioData) {
    const apiUrl = "http://localhost:4204/api/carla";
    return new Promise((resolve, reject) => {
      $.ajax({
        url: apiUrl,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(scenarioData),
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
