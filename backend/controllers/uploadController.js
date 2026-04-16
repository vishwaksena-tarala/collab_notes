const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage configuration with unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name: timestamp-randomnum-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure filter for images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF are allowed.'), false); // Reject the file
  }
};

// Configure limits (10 MB max)
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

/**
 * @route   POST /api/upload
 * @desc    Upload an attachment (photo or PDF)
 * @access  Private
 */
const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file rejected.' });
  }

  // Construct URL to access the file
  // Assuming the node server is running on the origin or proxied
  // Providing absolute URL if API is on a different domain, or an absolute path
  // Since we serve /uploads, we can just return the relative path from the server root
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(201).json({
    message: 'File uploaded successfully',
    url: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
  });
};

/**
 * @route   GET /api/upload/images
 * @desc    List all uploaded image files (for the image gallery)
 * @access  Private
 */
const getImages = (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    const files = fs.readdirSync(uploadDir)
      .filter((f) => imageExts.includes(path.extname(f).toLowerCase()))
      .map((f) => ({
        filename: f,
        url: `${baseUrl}/${f}`,
      }))
      .reverse(); // Newest first (files are named with timestamp prefix)

    res.json({ images: files });
  } catch (err) {
    console.error('getImages error:', err);
    res.status(500).json({ message: 'Failed to list images' });
  }
};

module.exports = {
  upload,
  uploadFile,
  getImages,
};
