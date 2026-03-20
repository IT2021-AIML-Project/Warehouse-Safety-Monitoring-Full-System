const express = require('express');
const router = express.Router();
const ppeItemController = require('../controllers/ppeItemController');

// Create a new PPE item
router.post('/', ppeItemController.createPPEItem);

// Get all PPE items
router.get('/', ppeItemController.getAllPPEItems);

// Get PPE items by zone
router.get('/zone/:zoneId', ppeItemController.getItemsByZone);

// Update a PPE item
router.put('/:id', ppeItemController.updatePPEItem);

// Delete a PPE item
router.delete('/:id', ppeItemController.deletePPEItem);

module.exports = router;
