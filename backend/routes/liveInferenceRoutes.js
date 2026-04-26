const express = require('express');
const {
    saveLiveWindow,
    getLiveSummary,
    getHourlyReport,
    getDateRangeReport,
    exportCSV,
} = require('../controllers/liveInferenceController');

const router = express.Router();

router.post('/live', saveLiveWindow);
router.get('/summary', getLiveSummary);
router.get('/hourly', getHourlyReport);
router.get('/range', getDateRangeReport);
router.get('/export/csv', exportCSV);

module.exports = router;
