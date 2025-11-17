const express = require('express');
const controller = require('../controllers/itemController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.put('/:itemId', auth, roles(['admin', 'manager']), controller.update);
router.delete('/:itemId', auth, roles(['admin']), controller.remove);

module.exports = router;
