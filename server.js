process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', reason);
});

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
const documentRoutes = require('./routes/documentRoutes');

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
app.use('/documents', documentRoutes);

app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});