const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const clientController = require('../controllers/clientController');

router.use(authenticate);
router.post('/', clientController.create);
router.get('/', clientController.getAll);

module.exports = router;