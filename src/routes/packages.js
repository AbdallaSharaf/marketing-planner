const express = require('express');
const controller = require('../controllers/packageController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.get('/:id', auth, controller.get);
router.put('/:id', auth, roles(['admin', 'manager']), controller.update);
router.delete('/:id', auth, roles(['admin']), controller.remove);
router.patch(
  '/:id/activate',
  auth,
  roles(['admin', 'manager']),
  controller.activate
);
router.patch(
  '/:id/deactivate',
  auth,
  roles(['admin', 'manager']),
  controller.deactivate
);

module.exports = router;
