const express = require('express');
const controller = require('../controllers/swotController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.get('/', auth, controller.get);
router.put('/', auth, roles(['admin', 'manager']), controller.update);

module.exports = router;
