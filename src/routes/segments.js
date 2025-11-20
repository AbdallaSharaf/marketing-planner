const express = require('express');
const controller = require('../controllers/segmentController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.post('/bulk', auth, roles(['admin', 'manager']), controller.bulkCreate); // Add this line
router.put('/:segmentId', auth, roles(['admin', 'manager']), controller.update);
router.delete('/:segmentId', auth, roles(['admin']), controller.remove);

module.exports = router;
