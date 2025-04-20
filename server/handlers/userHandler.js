const { getUserWithPhoto } = require("../helpers/userHelper");

async function getUser(token) {
  try {
    return await getUserWithPhoto(token);
  } catch (error) {
    console.error("Error in getUser:", error);
    throw error;
  }
}

module.exports = { getUser };
