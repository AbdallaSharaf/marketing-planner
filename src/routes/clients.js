const express = require('express');
const auth = require('../middleware/auth');
const clientController = require('../controllers/clientController');
const exportController = require('../controllers/exportController');

const router = express.Router();

// Client routes
router.get('/', auth, clientController.list);
// Export clients CSV
router.get('/export', auth, exportController.exportClients);
router.post('/', auth, clientController.create);
router.get('/:id', auth, clientController.getById);
router.put('/:id', auth, clientController.update);
router.delete('/:id', auth, clientController.delete);


module.exports = router;
