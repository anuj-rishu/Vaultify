const axios = require("axios");
const cheerio = require("cheerio");
const { extractCookies } = require("../utils/extractUtils");

class ProfileFetcher {
  constructor(cookie) {
    this.cookie = cookie;
    this.baseUrl = "https://academia.srmist.edu.in";
  }

  async getProfileData() {
    try {
      const response = await axios({
        method: "GET",
        url: `${this.baseUrl}/srm_university/academia-academic-services/report/Student_Profile_Report?urlParams=%7B%7D`,
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          Referer: `${this.baseUrl}/`,
          cookie: extractCookies(this.cookie),
        },
        responseType: "text",
      });

      try {
        const jsonData = JSON.parse(response.data);
        return jsonData;
      } catch (e) {
        return { HTML: response.data };
      }
    } catch (error) {
      console.error("Error fetching profile data:", error.message);
      throw error;
    }
  }

  extractPhotoDetails(data) {
    const imgMatch = data.match(
      /src="([^"]*\/Your_Photo\/download-file\?filepath=[^"&]+&digestValue=[^"&]+)"/
    );

    if (imgMatch && imgMatch[1]) {
      return imgMatch[1].replace(/&amp;/g, "&");
    }

    const filepathMatch = data.match(/filepath=([^"&\s]+)/);
    const digestMatch = data.match(/digestValue=([^"&\s]+)/);

    if (filepathMatch && digestMatch) {
      return {
        filepath: filepathMatch[1],
        digestValue: digestMatch[1],
      };
    }

    return null;
  }

  async getProfile() {
    try {
      const profileData = await this.getProfileData();
      const studentData = {};

      const photoDetails =
        profileData && profileData.HTML
          ? this.extractPhotoDetails(profileData.HTML)
          : null;

      if (profileData && profileData.MODEL) {
        const model = profileData.MODEL;

        let studentId = "";
        if (model.DATAJSONARRAY && model.DATAJSONARRAY.length > 0) {
          studentId = model.DATAJSONARRAY[0].unformattedID || "";
        }

        let name = "";
        if (
          model.DATAJSONARRAY &&
          model.DATAJSONARRAY.length > 0 &&
          model.DATAJSONARRAY[0].Name
        ) {
          name = model.DATAJSONARRAY[0].Name;
        }

        studentData.id = studentId;
        studentData.name = name;

        if (photoDetails) {
          if (typeof photoDetails === "string") {
            studentData.photoUrl = photoDetails.startsWith("/")
              ? `${this.baseUrl}${photoDetails}`
              : photoDetails;
          } else {
            studentData.photoUrl = `${this.baseUrl}/srm_university/academia-academic-services/report/Student_Profile_Report/${studentId}/Your_Photo/download-file?filepath=${photoDetails.filepath}&digestValue=${photoDetails.digestValue}`;
          }

          try {
            const photoData = await this.getDirectPhotoBase64(
              studentData.photoUrl
            );
            studentData.photoBase64 = photoData.dataUrl;
          } catch (photoError) {
            console.warn("Could not get photo data:", photoError.message);
          }
        } else if (studentId) {
          studentData.photoUrl = `${this.baseUrl}/srm_university/academia-academic-services/report/Student_Profile_Report/${studentId}/Your_Photo/download-file?filepath=/1673939762447_710&digestValue=e30=`;

          try {
            const photoData = await this.getDirectPhotoBase64(
              studentData.photoUrl
            );
            studentData.photoBase64 = photoData.dataUrl;
          } catch (photoError) {
            console.warn(
              "Could not get photo data with hardcoded URL:",
              photoError.message
            );
          }
        }

        if (profileData.HTML) {
          const $ = cheerio.load(profileData.HTML);

          const regNumberMatch = profileData.HTML.match(/RA2\d{12}/);
          studentData.regNumber = regNumberMatch ? regNumberMatch[0] : "";

          $("table").each((_, table) => {
            const $table = $(table);

            $table.find("tr").each((_, row) => {
              const cells = $(row).find("td");
              if (cells.length >= 2) {
                const label = $(cells[0])
                  .text()
                  .trim()
                  .toLowerCase()
                  .replace(/:/g, "")
                  .replace(/\s+/g, "_");
                const value = $(cells[1]).text().trim();

                if (label && value) {
                  studentData[label] = value;
                }
              }
            });
          });
        }
      } else if (profileData.HTML) {
        const html = profileData.HTML;
        const $ = cheerio.load(html);

        const regNumberMatch = html.match(/RA2\d{12}/);
        studentData.regNumber = regNumberMatch ? regNumberMatch[0] : "";

        const studentIdMatch = html.match(
          /Student_Profile_Report\/(\d+)\/Your_Photo/
        );
        if (studentIdMatch && studentIdMatch[1]) {
          studentData.id = studentIdMatch[1];

          if (photoDetails) {
            if (typeof photoDetails === "string") {
              studentData.photoUrl = photoDetails.startsWith("/")
                ? `${this.baseUrl}${photoDetails}`
                : photoDetails;
            } else {
              studentData.photoUrl = `${this.baseUrl}/srm_university/academia-academic-services/report/Student_Profile_Report/${studentData.id}/Your_Photo/download-file?filepath=${photoDetails.filepath}&digestValue=${photoDetails.digestValue}`;
            }
          } else {
            studentData.photoUrl = `${this.baseUrl}/srm_university/academia-academic-services/report/Student_Profile_Report/${studentData.id}/Your_Photo/download-file?filepath=/1673939762447_710&digestValue=e30=`;
          }
        }

        $("table").each((_, table) => {
          const $table = $(table);

          $table.find("tr").each((_, row) => {
            const cells = $(row).find("td");
            if (cells.length >= 2) {
              const label = $(cells[0])
                .text()
                .trim()
                .toLowerCase()
                .replace(/:/g, "")
                .replace(/\s+/g, "_");
              const value = $(cells[1]).text().trim();

              if (label && value) {
                studentData[label] = value;
              }
            }
          });
        });
      }

      return {
        ...studentData,
        status: 200,
      };
    } catch (error) {
      console.error("Error in profile retrieval:", error);
      return {
        status: 500,
        error: error.message,
      };
    }
  }

  async getDirectPhotoBase64(url) {
    try {
      const imageResponse = await axios({
        method: "GET",
        url: url,
        headers: {
          Referer: `${this.baseUrl}/srm_university/academia-academic-services/report/Student_Profile_Report`,
          cookie: extractCookies(this.cookie),
        },
        responseType: "arraybuffer",
      });

      const base64 = Buffer.from(imageResponse.data, "binary").toString(
        "base64"
      );
      const contentType = imageResponse.headers["content-type"] || "image/jpeg";

      return {
        dataUrl: `data:${contentType};base64,${base64}`,
        contentType,
        base64,
      };
    } catch (error) {
      console.error("Error getting photo:", error.message);
      throw error;
    }
  }
}

module.exports = ProfileFetcher;
