const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const documentController = require('../controllers/documentController');

// Protect all routes
router.use(authenticate);

router.post('/', documentController.create);
router.get('/', documentController.getAll);

// Email route (only if you have created emailController.js)
const emailController = require('../controllers/emailController');
router.post('/:id/send', emailController.sendDocument);

module.exports = router;