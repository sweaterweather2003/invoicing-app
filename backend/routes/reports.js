const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

router.use(authenticate);

router.get('/stats', reportController.getDashboardStats);
router.get('/pandl', reportController.getPAndL);

module.exports = router;