const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} = require('../controllers/folderController');

router.use(protect);

router.route('/')
  .get(getFolders)
  .post(createFolder);

router.route('/:id')
  .put(updateFolder)
  .delete(deleteFolder);

module.exports = router;
