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
  // Set a shorter timeout to ensure we respond before Heroku's 30s limit
  const timeout = setTimeout(() => {
    logger.warn('Request timeout in getDocuments');
    if (!res.headersSent) {
      res.status(503).json({ error: "Request timed out" });
    }
  }, 15000); // Reduced to 15s for more safety margin
  
  try {
    logger.info("Fetching documents for user", { userId: req.user._id });
    
    // Smaller batch size for faster response
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Further reduced limit
    const skip = (page - 1) * limit;
    
    // First get just the documents without counting total
    const documents = await Document.find({ userId: req.user._id })
      .select('_id originalName fileType fileSize downloadUrl createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    logger.info(`Found ${documents.length} documents`);
    
    // Process in small batches to avoid memory spikes
    const formattedDocuments = documents.map(doc => ({
      id: doc._id,
      fileName: doc.originalName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      downloadUrl: doc.downloadUrl,
      createdAt: doc.createdAt
    }));
    
    // Count in separate query only if needed for pagination
    let totalCount = 0;
    let hasMore = false;
    
    if (documents.length === limit) {
      // If we have a full page, just indicate there's more without counting
      hasMore = true;
    } else {
      // Only count if we need an exact pagination
      totalCount = await Document.countDocuments({ userId: req.user._id });
    }
    
    logger.info("Preparing response");
    
    clearTimeout(timeout);
    
    // Send minimal response immediately
    return res.status(200).json({
      documents: formattedDocuments,
      pagination: {
        page,
        limit,
        hasMore,
        total: totalCount || undefined,
        pages: totalCount ? Math.ceil(totalCount / limit) : undefined
      }
    });
  } catch (error) {
    clearTimeout(timeout);
    logger.error("Error retrieving documents", { error: error.message });
    
    if (!res.headersSent) {
      return res.status(500).json({ error: "Failed to retrieve documents" });
    }
  }
}

async function searchDocuments(req, res) {
  const timeout = setTimeout(() => {
    res.status(503).json({ error: "Request timed out" });
  }, 25000);
  
  try {
    const { query } = req.query;

    if (!query) {
      clearTimeout(timeout);
      return res.status(400).json({ error: "Search query is required" });
    }
    
    logger.info("Searching documents", { query });
    
    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const documents = await Document.find({
      userId: req.user._id,
      $or: [
        { originalName: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ],
    })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

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

    clearTimeout(timeout);
    res.json({
      documents: formattedDocuments,
      pagination: {
        page,
        limit,
        hasMore: documents.length === limit
      }
    });
  } catch (error) {
    clearTimeout(timeout);
    logger.error("Error searching documents", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Failed to search documents" });
  }
}

// Apply same optimizations to other methods
async function getDocument(req, res) {
  const timeout = setTimeout(() => {
    res.status(503).json({ error: "Request timed out" });
  }, 25000);
  
  try {
    const documentId = req.params.id;
    logger.info("Fetching single document", { documentId });

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
    }).lean();

    if (!document) {
      clearTimeout(timeout);
      return res.status(404).json({ error: "Document not found" });
    }

    clearTimeout(timeout);
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
    clearTimeout(timeout);
    logger.error(`Error retrieving document: ${req.params.id}`, {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: "Failed to retrieve document" });
  }
}

// Apply similar optimizations to other methods
async function deleteDocument(req, res) {
  /* Keep implementation the same */
}

async function searchByFilename(req, res) {
  /* Keep implementation the same */
}

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  searchDocuments,
  searchByFilename, 
};