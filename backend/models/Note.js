const mongoose = require('mongoose');

/**
 * Version snapshot schema — stored inside each Note document.
 * Keeps the last 10 versions for restore functionality.
 */
const versionSchema = new mongoose.Schema(
  {
    content: { type: String, default: '' },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/**
 * Note Schema
 * Core document for the collaborative notes system.
 */
const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: 'Untitled Note',
    },
    content: {
      type: String,
      default: '', // Raw markdown/plain text content
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    /**
     * Version history: last 10 saved snapshots.
     * Older versions are trimmed automatically in the controller.
     */
    versions: [versionSchema],

    /**
     * Folder this note belongs to (optional).
     */
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },

    /**
     * Soft-delete flag (future use).
     */
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// Index for fast lookup by owner and collaborators
noteSchema.index({ owner: 1 });
noteSchema.index({ collaborators: 1 });
noteSchema.index({ title: 'text' }); // Enable text search on title

module.exports = mongoose.model('Note', noteSchema);
