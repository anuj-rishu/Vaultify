const express = require("express");
const multer = require("multer");
const { tokenMiddleware } = require("../middleware/authMiddleware");
const {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
} = require("../handlers/documentHandler");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/upload", tokenMiddleware, upload.single("file"), uploadDocument);

// Get all documents for the user
router.get("/", tokenMiddleware, getDocuments);

// Get a specific document
router.get("/:id", tokenMiddleware, getDocument);

// Delete a document
router.delete("/:id", tokenMiddleware, deleteDocument);

module.exports = router;
