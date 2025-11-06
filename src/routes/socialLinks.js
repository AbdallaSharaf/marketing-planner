const express = require('express');
const controller = require('../controllers/socialLinkController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.put('/:linkId', auth, roles(['admin', 'manager']), controller.update);
router.delete('/:linkId', auth, roles(['admin']), controller.remove);

module.exports = router;
