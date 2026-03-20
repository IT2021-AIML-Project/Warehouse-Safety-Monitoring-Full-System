const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');

// Create a new zone
router.post('/', zoneController.createZone);

// Get all zones
router.get('/', zoneController.getAllZones);

// Update a zone
router.put('/:id', zoneController.updateZone);

// Delete a zone
router.delete('/:id', zoneController.deleteZone);

module.exports = router;
