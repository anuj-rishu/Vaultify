const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    b2FileId: { type: String, required: true },
    b2FileName: { type: String, required: true },
    downloadUrl: { type: String, required: true },
    description: String,
    tags: [String],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Document || mongoose.model("Document", documentSchema);