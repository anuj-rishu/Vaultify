const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const compression = require("compression");
const etag = require("etag");
const { limiter } = require("./middleware/rateLimiter");
const routes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const connectDB = require("./config/db");

if (process.env.DEV_MODE === "true") {
  dotenv.config();
}

const app = express();
const port = process.env.PORT || 9000;
connectDB();

app.use(bodyParser.json());
app.use(compression());
app.set("etag", true);

const urls = process.env.URL;
let allowedOrigins = "http://localhost:5173";
if (urls) {
  allowedOrigins += "," + urls;
}

app.use(
  cors({
    origin: allowedOrigins.split(","),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "Content-Type",
      "Accept",
      "X-CSRF-Token",
      "Authorization",
    ],
    exposedHeaders: ["Content-Length"],
    credentials: true,
  })
);

app.use(limiter);

app.use("/", routes);
app.use("/auth", authRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
