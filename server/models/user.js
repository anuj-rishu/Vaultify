const mongoose = require('mongoose');

const advisorSchema = new mongoose.Schema({
  name: String,
  role: String,
  email: String,
  phone: String
});

const userSchema = new mongoose.Schema({
  regNumber: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  mobile: String,
  program: String,
  semester: Number,
  batch: String,
  year: Number,
  department: String,
  section: String,
  photoUrl: String,
  photoBase64: String,
  advisors: [advisorSchema],
  token: {
    type: String,
    required: true
  },
  tokenCreatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);