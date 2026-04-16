const Folder = require('../models/Folder');
const Note   = require('../models/Note');

/**
 * @route   GET /api/folders
 * @desc    Get all folders for the current user
 * @access  Private
 */
const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ owner: req.user._id }).sort({ createdAt: 1 });
    res.json({ folders });
  } catch (err) {
    console.error('getFolders error:', err);
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
};

/**
 * @route   POST /api/folders
 * @desc    Create a new folder
 * @access  Private
 */
const createFolder = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Folder name is required' });
  }
  try {
    const folder = await Folder.create({ name: name.trim(), owner: req.user._id });
    res.status(201).json({ folder });
  } catch (err) {
    console.error('createFolder error:', err);
    res.status(500).json({ message: 'Failed to create folder' });
  }
};

/**
 * @route   PUT /api/folders/:id
 * @desc    Rename a folder
 * @access  Private (owner only)
 */
const updateFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    if (folder.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
    folder.name = name.trim();
    await folder.save();
    res.json({ folder });
  } catch (err) {
    console.error('updateFolder error:', err);
    res.status(500).json({ message: 'Failed to update folder' });
  }
};

/**
 * @route   DELETE /api/folders/:id
 * @desc    Delete a folder; notes inside become un-foldered
 * @access  Private (owner only)
 */
const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    if (folder.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }
    // Un-folder all notes in this folder
    await Note.updateMany({ folder: folder._id }, { $set: { folder: null } });
    await folder.deleteOne();
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    console.error('deleteFolder error:', err);
    res.status(500).json({ message: 'Failed to delete folder' });
  }
};

module.exports = { getFolders, createFolder, updateFolder, deleteFolder };
