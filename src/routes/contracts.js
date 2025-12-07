const express = require('express');
const controller = require('../controllers/contractController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.get('/:id', auth, controller.get);
router.put('/:id', auth, roles(['admin', 'manager']), controller.update);

// New term management endpoints
router.post('/:id/terms', auth, roles(['admin', 'manager']), controller.addTerm);
router.patch('/:id/terms/reorder', auth, roles(['admin', 'manager']), controller.reorderTerms);

router.delete('/:id', auth, roles(['admin']), controller.remove);
router.patch('/:id/sign', auth, roles(['admin', 'manager']), controller.sign);
router.patch(
  '/:id/activate',
  auth,
  roles(['admin', 'manager']),
  controller.activate
);
router.patch(
  '/:id/complete',
  auth,
  roles(['admin', 'manager']),
  controller.complete
);
router.patch(
  '/:id/cancel',
  auth,
  roles(['admin', 'manager']),
  controller.cancel
);
router.post('/:id/renew', auth, roles(['admin', 'manager']), controller.renew);

module.exports = router;
