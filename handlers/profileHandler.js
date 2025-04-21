const ProfileFetcher = require("../helpers/profileHelper");

async function getProfile(token) {
  try {
    const profileFetcher = new ProfileFetcher(token);
    return await profileFetcher.getProfile();
  } catch (error) {
    console.error("Error in profile handler:", error);
    return {
      status: 500,
      error: error.message
    };
  }
}

module.exports = { getProfile };