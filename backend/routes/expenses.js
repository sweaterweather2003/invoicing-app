const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const expenseController = require('../controllers/expenseController');

router.use(authenticate);
router.post('/', expenseController.create);
router.get('/', expenseController.getAll);

module.exports = router;