const express = require('express');
const controller = require('../controllers/auditController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/', auth, roles(['admin']), controller.list);

module.exports = router;
