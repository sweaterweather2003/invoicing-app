const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const recurringController = require('../controllers/recurringController');

router.use(authenticate);

router.post('/', recurringController.create);
router.get('/', recurringController.getAll);

module.exports = router;