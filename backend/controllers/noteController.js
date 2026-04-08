const { validationResult } = require('express-validator');
const Note = require('../models/Note');
const User = require('../models/User');

/**
 * Helper: check if the requesting user is the owner OR a collaborator.
 */
const hasAccess = (note, userId) => {
  const ownerId = note.owner._id ? note.owner._id.toString() : note.owner.toString();
  const uid = userId.toString();
  
  return (
    ownerId === uid ||
    note.collaborators.some((c) => {
      const cId = c._id ? c._id.toString() : c.toString();
      return cId === uid;
    })
  );
};

/**
 * @route   GET /api/notes
 * @desc    Get all notes owned by or shared with the current user
 * @access  Private
 */
const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
      isDeleted: false,
    })
      .populate('owner', 'username email')
      .populate('collaborators', 'username email')
      .sort({ updatedAt: -1 }); // Most recently updated first

    res.json({ notes });
  } catch (error) {
    console.error('getNotes error:', error);
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};

/**
 * @route   GET /api/notes/:id
 * @desc    Get a single note by ID
 * @access  Private
 */
const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('collaborators', 'username email')
      .populate('versions.savedBy', 'username');

    if (!note || note.isDeleted) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (!hasAccess(note, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ note });
  } catch (error) {
    console.error('getNoteById error:', error);
    res.status(500).json({ message: 'Failed to fetch note' });
  }
};

/**
 * @route   POST /api/notes
 * @desc    Create a new note
 * @access  Private
 */
const createNote = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { title, content } = req.body;

  try {
    const note = await Note.create({
      title: title || 'Untitled Note',
      content: content || '',
      owner: req.user._id,
    });

    await note.populate('owner', 'username email');

    res.status(201).json({ note });
  } catch (error) {
    console.error('createNote error:', error);
    res.status(500).json({ message: 'Failed to create note' });
  }
};

/**
 * @route   PUT /api/notes/:id
 * @desc    Update a note's title and/or content
 * @access  Private (owner or collaborator)
 */
const updateNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note || note.isDeleted) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (!hasAccess(note, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, content } = req.body;

    // Save current content to version history before overwriting
    if (content !== undefined && content !== note.content) {
      note.versions.push({
        content: note.content,
        savedBy: req.user._id,
        savedAt: new Date(),
      });

      // Keep only the last 10 versions
      if (note.versions.length > 10) {
        note.versions = note.versions.slice(-10);
      }
    }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;

    await note.save();
    await note.populate('owner', 'username email');
    await note.populate('collaborators', 'username email');

    res.json({ note });
  } catch (error) {
    console.error('updateNote error:', error);
    res.status(500).json({ message: 'Failed to update note' });
  }
};

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete a note (owner only)
 * @access  Private (owner only)
 */
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note || note.isDeleted) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Only the owner can delete a note
    if (note.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete this note' });
    }

    note.isDeleted = true;
    await note.save();

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('deleteNote error:', error);
    res.status(500).json({ message: 'Failed to delete note' });
  }
};

/**
 * @route   POST /api/notes/:id/share
 * @desc    Add a collaborator to a note by email or username
 * @access  Private (owner only)
 */
const shareNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note || note.isDeleted) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can share this note' });
    }

    const { identifier } = req.body; // email or username
    if (!identifier) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    // Find target user by email OR username
    const targetUser = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot share a note with yourself' });
    }

    if (note.collaborators.includes(targetUser._id)) {
      return res.status(409).json({ message: 'User is already a collaborator' });
    }

    note.collaborators.push(targetUser._id);
    await note.save();
    await note.populate('collaborators', 'username email');

    res.json({
      message: `Note shared with ${targetUser.username}`,
      collaborators: note.collaborators,
    });
  } catch (error) {
    console.error('shareNote error:', error);
    res.status(500).json({ message: 'Failed to share note' });
  }
};

/**
 * @route   POST /api/notes/:id/restore
 * @desc    Restore a note to a previous version
 * @access  Private (owner or collaborator)
 */
const restoreVersion = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note || note.isDeleted) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (!hasAccess(note, req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { versionId } = req.body;
    const version = note.versions.id(versionId);

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    // Save current content as a new version before restoring
    note.versions.push({
      content: note.content,
      savedBy: req.user._id,
      savedAt: new Date(),
    });

    note.content = version.content;

    if (note.versions.length > 10) {
      note.versions = note.versions.slice(-10);
    }

    await note.save();

    res.json({ note, message: 'Version restored successfully' });
  } catch (error) {
    console.error('restoreVersion error:', error);
    res.status(500).json({ message: 'Failed to restore version' });
  }
};

module.exports = {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  shareNote,
  restoreVersion,
};
