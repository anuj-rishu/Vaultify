function tokenMiddleware(req, res, next) {
  const token = req.headers["x-csrf-token"];
  if (!token) {
    return res.status(400).json({
      error: "Missing X-CSRF-Token header",
    });
  }
  next();
}

module.exports = { tokenMiddleware };