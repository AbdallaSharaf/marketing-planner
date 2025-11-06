const express = require('express');
const controller = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/clients', auth, controller.clients);
router.get('/revenue', auth, controller.revenue);
router.get('/services', auth, controller.services);

module.exports = router;
