const express = require('express');
const controller = require('../controllers/quotationController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.get('/:id', auth, controller.get);
router.put('/:id', auth, roles(['admin', 'manager']), controller.update);
router.delete('/:id', auth, roles(['admin']), controller.remove);
router.post('/:id/send', auth, roles(['admin', 'manager']), controller.send);
router.patch(
  '/:id/approve',
  auth,
  roles(['admin', 'manager']),
  controller.approve
);
router.patch(
  '/:id/reject',
  auth,
  roles(['admin', 'manager']),
  controller.reject
);
router.get('/:id/pdf', auth, controller.pdf);
router.post(
  '/:id/convert-to-contract',
  auth,
  roles(['admin', 'manager']),
  controller.convertToContract
);

module.exports = router;
