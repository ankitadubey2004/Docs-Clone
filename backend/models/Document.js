// models/Document.js
const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema({
  delta: {
    type: Object,
    default: null
  },
  html: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  // Backwards-compatible HTML content (for exports / older clients)
  content: {
    type: String,
    default: ''
  },
  // Quill Delta JSON (recommended)
  contentDelta: {
    type: Object,
    default: { ops: [] }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer'
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  versions: [documentVersionSchema],
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ 'collaborators.user': 1 });

module.exports = mongoose.model('Document', documentSchema);
