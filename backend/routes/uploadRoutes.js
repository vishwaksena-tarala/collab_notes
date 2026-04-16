const express = require('express');
const { upload, uploadFile, getImages } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Require authentication for uploads
router.use(protect);

// Use multer middleware to handle single file upload field named 'file'
// Handle multer errors specifically to prevent crashing
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadFile);

// List previously uploaded images (for gallery modal)
router.get('/images', getImages);

module.exports = router;
