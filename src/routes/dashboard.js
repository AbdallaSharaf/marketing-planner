const express = require('express');
const controller = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

router.get('/stats', auth, controller.stats);
router.get('/recent-sales', auth, controller.recentSales);
router.get('/top-products', auth, controller.topProducts);

module.exports = router;
