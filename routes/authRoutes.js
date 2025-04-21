const express = require('express');
const { login, logout } = require('../handlers/loginHandler');
const { tokenMiddleware } = require('../middleware/authMiddleware');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { account: username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Missing account or password",
      });
    }

    const loginResult = await login(username, password);
    res.json(loginResult);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

router.delete("/logout", tokenMiddleware, async (req, res) => {
  try {
    const token = req.headers["x-csrf-token"];
    const logoutResult = await logout(token);
    res.json(logoutResult);
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;