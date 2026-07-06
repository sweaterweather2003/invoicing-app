const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const companyController = require('../controllers/companyController');

router.use(authenticate);
router.get('/', companyController.getCompany);
router.put('/', companyController.updateCompany);

module.exports = router;