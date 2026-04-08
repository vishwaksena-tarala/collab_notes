const express = require('express');
const { body } = require('express-validator');
const {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  shareNote,
  restoreVersion,
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes below require authentication
router.use(protect);

// @route GET /api/notes
router.get('/', getNotes);

// @route GET /api/notes/:id
router.get('/:id', getNoteById);

// @route POST /api/notes
router.post(
  '/',
  [body('title').optional().trim().isLength({ max: 200 }).withMessage('Title too long')],
  createNote
);

// @route PUT /api/notes/:id
router.put('/:id', updateNote);

// @route DELETE /api/notes/:id
router.delete('/:id', deleteNote);

// @route POST /api/notes/:id/share
router.post('/:id/share', shareNote);

// @route POST /api/notes/:id/restore
router.post('/:id/restore', restoreVersion);

module.exports = router;
