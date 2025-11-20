const express = require('express');
const controller = require('../controllers/competitorController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.post('/bulk', auth, roles(['admin', 'manager']), controller.bulkCreate); // Add this
router.put(
  '/:competitorId',
  auth,
  roles(['admin', 'manager']),
  controller.update
);
router.delete('/:competitorId', auth, roles(['admin']), controller.remove);

module.exports = router;
