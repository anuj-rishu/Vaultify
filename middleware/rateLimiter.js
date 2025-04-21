const rateLimit = require("express-rate-limit");

function encodeToken(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `${hash}${(hash >> 1).toString(16)}${(hash >> 2).toString(32)}`;
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  keyGenerator: (req) => {
    const token = req.headers["x-csrf-token"];
    if (token) {
      return encodeToken(token);
    }
    return req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Rate limit exceeded",
    });
  },
});

module.exports = { limiter, encodeToken };