const Document = require("../models/document");
const b2Helper = require("../helpers/b2Helper");
const path = require("path");
const crypto = require("crypto");

async function uploadDocument(req, res) {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { description, tags } = req.body;

    const uniquePrefix = crypto.randomBytes(16).toString("hex");
    const fileName = `${uniquePrefix}_${path.basename(file.originalname)}`;

    const b2Response = await b2Helper.uploadFile(
      fileName,
      file.buffer,
      file.mimetype
    );

    const downloadUrl = b2Helper.getDownloadUrl(b2Response.fileName);

    const document = new Document({
      userId: req.user._id,
      fileName: fileName,
      originalName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      b2FileId: b2Response.fileId,
      b2FileName: b2Response.fileName,
      downloadUrl: downloadUrl,
      description: description || "",
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
    });

    await document.save();

    res.status(201).json({
      message: "Document uploaded successfully",
      document: {
        id: document._id,
        fileName: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        description: document.description,
        tags: document.tags,
        downloadUrl: document.downloadUrl,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
}

async function getDocuments(req, res) {
  try {
    const documents = await Document.find({ userId: req.user._id });

    const formattedDocuments = documents.map((doc) => ({
      id: doc._id,
      fileName: doc.originalName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      description: doc.description,
      tags: doc.tags,
      downloadUrl: doc.downloadUrl,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    res.json(formattedDocuments);
  } catch (error) {
    console.error("Error retrieving documents:", error);
    res.status(500).json({ error: "Failed to retrieve documents" });
  }
}

async function getDocument(req, res) {
  try {
    const documentId = req.params.id;

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({
      id: document._id,
      fileName: document.originalName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      description: document.description,
      tags: document.tags,
      downloadUrl: document.downloadUrl,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error("Error retrieving document:", error);
    res.status(500).json({ error: "Failed to retrieve document" });
  }
}

async function deleteDocument(req, res) {
  try {
    const documentId = req.params.id;

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    await b2Helper.deleteFile(document.b2FileId, document.b2FileName);

    await Document.deleteOne({ _id: documentId });

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
}

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
};
