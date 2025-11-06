const express = require('express');
const controller = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.post(
  '/',
  auth,
  roles(['admin', 'manager', 'employee']),
  controller.uploadMiddleware,
  controller.upload
);

module.exports = router;
