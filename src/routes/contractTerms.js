// routes/contractTerms.js
const express = require('express');
const controller = require('../controllers/contractTermController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/', auth, controller.list);
router.post('/', auth, roles(['admin', 'manager']), controller.create);
router.post('/bulk', auth, roles(['admin', 'manager']), controller.bulkCreate);
router.get('/:id', auth, controller.get);
router.put('/:id', auth, roles(['admin', 'manager']), controller.update);
router.delete('/:id', auth, roles(['admin']), controller.remove);

module.exports = router;
