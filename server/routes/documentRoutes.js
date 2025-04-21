const express = require("express");
const multer = require("multer");
const { tokenMiddleware } = require("../middleware/authMiddleware");
const {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  searchByFilename,
} = require("../handlers/documentHandler");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/upload", tokenMiddleware, upload.single("file"), uploadDocument);

router.get("/", tokenMiddleware, getDocuments);

router.get("/search/:filename", tokenMiddleware, searchByFilename);

router.get("/:id", tokenMiddleware, getDocument);

router.delete("/:id", tokenMiddleware, deleteDocument);

module.exports = router;
