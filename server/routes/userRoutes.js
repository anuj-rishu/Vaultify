const express = require('express');
const { tokenMiddleware } = require('../middleware/authMiddleware');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { getProfile } = require('../handlers/profileHandler');
const { getUser } = require('../handlers/userHandler');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

router.get("/profile", tokenMiddleware, cacheMiddleware, async (req, res) => {
  try {
    const profile = await getProfile(req.headers["x-csrf-token"]);
    res.json(profile);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/user", tokenMiddleware, cacheMiddleware, async (req, res) => {
  try {
    const user = await getUser(req.headers["x-csrf-token"]);
    res.json(user);
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;