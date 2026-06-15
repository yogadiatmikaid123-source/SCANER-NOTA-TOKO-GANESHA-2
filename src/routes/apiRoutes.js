const express = require('express');
const router = express.Router();

// Import Controller
const scanController = require('../controllers/scanController');

// Definisi Endpoint (Alamat URL)
// Rute ini akan bisa diakses di POST http://localhost:5000/api/scan
router.post('/scan', scanController.processReceipt);

module.exports = router;
