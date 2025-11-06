const express = require('express');
const controller = require('../controllers/userController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/', auth, roles(['admin']), controller.list);
router.get('/:id', auth, roles(['admin']), controller.get);
router.put('/:id', auth, roles(['admin']), controller.update);
router.delete('/:id', auth, roles(['admin']), controller.remove);

module.exports = router;
