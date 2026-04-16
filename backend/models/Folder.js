const mongoose = require('mongoose');

/**
 * Folder Schema
 * Simple named folder owned by a user to organize their notes.
 */
const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: [100, 'Folder name cannot exceed 100 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

folderSchema.index({ owner: 1 });

module.exports = mongoose.model('Folder', folderSchema);
