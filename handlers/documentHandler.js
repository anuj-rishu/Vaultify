const Document = require("../models/document");
const b2Helper = require("../helpers/b2Helper");
const path = require("path");
const crypto = require("crypto");
const { promisify } = require("util");
const randomBytes = promisify(crypto.randomBytes);
const logger = require("../utils/logger");

const generateUniqueFileName = async (originalName) => {
  const uniquePrefix = (await randomBytes(8)).toString("hex");
  return `${uniquePrefix}_${path.basename(originalName)}`;
};

async function uploadDocument(req, res) {
  try {
    const file = req.file;

    if (!file) {
      logger.warn("No file uploaded in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { description, tags, customName } = req.body;

    const displayName = customName || file.originalname;

    const fileName = await generateUniqueFileName(file.originalname);

    const b2Response = await b2Helper.uploadFile(
      fileName,
      file.buffer,
      file.mimetype
    );

    const downloadUrl = b2Helper.getDownloadUrl(b2Response.fileName);

    const document = new Document({
      userId: req.user._id,
      fileName: fileName,
      originalName: displayName,
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
    logger.error("Error uploading document", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to upload document" });
  }
}

async function getDocuments(req, res) {
  try {
    const page = parseInt(req.query.page) || 1; // default page 1
    const limit = parseInt(req.query.limit) || 20; // default 20 documents per page
    const skip = (page - 1) * limit;

    const documents = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 }) // optional: latest first
      .skip(skip)
      .limit(limit);

    const totalDocuments = await Document.countDocuments({ userId: req.user._id });

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

    res.json({
      documents: formattedDocuments,
      currentPage: page,
      totalPages: Math.ceil(totalDocuments / limit),
      totalDocuments,
    });
  } catch (error) {
    logger.error("Error retrieving documents", { error: error.message });
    res.status(500).json({ error: "Failed to retrieve documents" });
  }
}


async function searchDocuments(req, res) {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const documents = await Document.find({
      userId: req.user._id,
      $or: [
        { originalName: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ],
    });

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
    logger.error("Error searching documents", { error: error.message });
    res.status(500).json({ error: "Failed to search documents" });
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
    logger.error(`Error retrieving document: ${req.params.id}`, {
      error: error.message,
    });
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
    logger.error(`Error deleting document: ${documentId}`, {
      error: error.message,
    });
    res.status(500).json({ error: "Failed to delete document" });
  }
}

async function searchByFilename(req, res) {
  try {
    const filename = req.params.filename;
    
    if (!filename) {
      return res.status(400).json({ error: "Filename parameter is required" });
    }
    
    const documents = await Document.find({
      userId: req.user._id,
      originalName: { $regex: filename, $options: 'i' } 
    });

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
    logger.error("Error searching documents by filename", { error: error.message });
    res.status(500).json({ error: "Failed to search documents by filename" });
  }
}

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  searchDocuments,
  searchByFilename, 
};

