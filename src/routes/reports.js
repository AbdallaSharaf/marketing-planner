const express = require('express');
const controller = require('../controllers/reportController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/', auth, controller.list);
router.post(
  '/',
  auth,
  roles(['admin', 'manager', 'employee']),
  controller.create
);
router.get('/:id', auth, controller.get);
router.put('/:id', auth, roles(['admin', 'manager']), controller.update);
router.delete('/:id', auth, roles(['admin']), controller.remove);
router.get('/:id/pdf', auth, controller.pdf);
router.get('/:id/excel', auth, controller.excel);

module.exports = router;
