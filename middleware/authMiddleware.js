const axios = require("axios");
const { getUserWithPhoto } = require("../helpers/userHelper");
const User = require("../models/user");

async function tokenMiddleware(req, res, next) {
  const token = req.headers["x-csrf-token"];
  if (!token) {
    return res.status(400).json({
      error: "Missing X-CSRF-Token header",
    });
  }

  try {
    try {
      const userData = await getUserWithPhoto(token);

      if (!userData || !userData.regNumber) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const user = await User.findOneAndUpdate(
        { regNumber: userData.regNumber },
        {
          ...userData,
          lastLogin: new Date(),
        },
        { upsert: true, new: true }
      );

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      console.error("Token validation error:", error);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("Error in tokenMiddleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { tokenMiddleware };
