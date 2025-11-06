const express = require('express');
const controller = require('../controllers/branchController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.put('/:branchId', auth, roles(['admin', 'manager']), controller.update);
router.delete('/:branchId', auth, roles(['admin']), controller.remove);

module.exports = router;
