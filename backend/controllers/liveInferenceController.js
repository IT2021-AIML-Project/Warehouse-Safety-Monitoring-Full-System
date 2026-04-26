const Inference = require('../models/Inference');
const Violation = require('../models/Violation');

const LIVE_SOURCE_TYPES = ['webcam', 'cctv'];

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function parseISODate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseDayStartUTC(day) {
    if (!day) return null;
    const d = new Date(`${day}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function addDaysUTC(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getLocalTimezoneOffset() {
    const offset = new Date().getTimezoneOffset();
    const sign = offset > 0 ? '-' : '+';
    const absOffset = Math.abs(offset);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
}

function computeSafetyScore(windowRecords) {
    if (!windowRecords || windowRecords.length === 0) return 0;
    const frameScores = windowRecords.map(frame => {
        if (frame.persons === 0) return 100; // empty frame = fully compliant
        const frameViolations = Math.min(frame.violations, frame.persons); // cap at persons
        return ((frame.persons - frameViolations) / frame.persons) * 100;
    });

    return Math.round(
        frameScores.reduce((a, b) => a + b, 0) / frameScores.length
    );
}

function normalizeSeverity(value, confidence) {
    if (value) {
        const v = String(value).trim().toLowerCase();
        if (v === 'high') return 'High';
        if (v === 'medium') return 'Medium';
        if (v === 'low') return 'Low';
    }

    const conf = toNumber(confidence, 0);
    if (conf >= 0.85) return 'High';
    if (conf >= 0.75) return 'Medium';
    return 'Low';
}

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (!/[",\n\r]/.test(str)) return str;
    return `"${str.replace(/"/g, '""')}"`;
}

exports.saveLiveWindow = async (req, res) => {
    try {
        const {
            source_type,
            zone_id,
            timestamp,
            total_persons,
            total_violations,
            safety_score,
            violation_details,
            frames,
        } = req.body;

        if (!source_type || !LIVE_SOURCE_TYPES.includes(String(source_type).toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'source_type must be webcam or cctv',
            });
        }

        const eventTime = parseISODate(timestamp) || new Date();
        const persons = Math.max(0, toNumber(total_persons, 0));
        const violations = Math.max(0, toNumber(total_violations, 0));

        const inference = new Inference({
            source_type: String(source_type).toLowerCase(),
            zone_id: zone_id || null,
            timestamp: eventTime,
            total_persons: persons,
            total_violations: violations,
            frames: frames || [],
            processing_time_ms: 0,
            model_version: 'live-window',
            camera_id: null,
        });

        await inference.save();

        const details = Array.isArray(violation_details) ? violation_details : [];
        const violationDocs = details
            .filter((item) => item && item.violation_type)
            .map((item) => ({
                inference_id: inference.inference_id,
                violation_type: String(item.violation_type),
                confidence: Math.max(0, Math.min(1, toNumber(item.confidence, 0))),
                severity: normalizeSeverity(item.severity, item.confidence),
                created_at: eventTime,
            }));

        if (violationDocs.length > 0) {
            await Violation.insertMany(violationDocs);
        }

        res.status(201).json({
            success: true,
            inference_id: inference._id,
        });
    } catch (error) {
        console.error('saveLiveWindow error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving live inference window',
            error: error.message,
        });
    }
};

exports.getLiveSummary = async (req, res) => {
    try {
        const since = parseISODate(req.query.since) || new Date(Date.now() - 15 * 60 * 1000);

        const rows = await Inference.aggregate([
            {
                $match: {
                    timestamp: { $gte: since },
                    source_type: { $in: LIVE_SOURCE_TYPES },
                },
            },
            {
                $group: {
                    _id: null,
                    total_persons: { $sum: '$total_persons' },
                    total_violations: { $sum: '$total_violations' },
                    last_updated: { $max: '$timestamp' },
                    windowRecords: {
                        $push: {
                            persons: '$total_persons',
                            violations: '$total_violations'
                        }
                    }
                },
            },
        ]);

        if (!rows.length) {
            return res.status(200).json({
                total_persons: 0,
                total_violations: 0,
                safety_score: 0,
                compliance_score: 0,
                last_updated: null,
            });
        }

        const summary = rows[0];
        const score = computeSafetyScore(summary.windowRecords);

        res.status(200).json({
            total_persons: summary.total_persons,
            total_violations: summary.total_violations,
            safety_score: score,
            compliance_score: score,
            last_updated: summary.last_updated,
        });
    } catch (error) {
        console.error('getLiveSummary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching live summary',
            error: error.message,
        });
    }
};

exports.getHourlyReport = async (req, res) => {
    try {
        const now = new Date();
        const fallbackDate = now.toISOString().slice(0, 10);
        const requested = req.query.date || fallbackDate;

        // Ensure requested format is valid YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(requested)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date. Use YYYY-MM-DD',
            });
        }

        const tz = getLocalTimezoneOffset();

        const rows = await Inference.aggregate([
            {
                $match: {
                    source_type: { $in: LIVE_SOURCE_TYPES },
                    $expr: {
                        $eq: [
                            { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: tz } },
                            requested
                        ]
                    }
                },
            },
            {
                $group: {
                    _id: { $hour: { date: '$timestamp', timezone: tz } },
                    violations: { $sum: '$total_violations' },
                    total_persons: { $sum: '$total_persons' },
                    windowRecords: {
                        $push: {
                            persons: '$total_persons',
                            violations: '$total_violations'
                        }
                    }
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const byHour = new Map();
        rows.forEach((r) => byHour.set(r._id, r));

        const report = [];
        for (let hour = 0; hour <= 23; hour += 1) {
            const row = byHour.get(hour) || { violations: 0, total_persons: 0, windowRecords: [] };
            const score = computeSafetyScore(row.windowRecords);
            report.push({
                hour: `${String(hour).padStart(2, '0')}:00`,
                violations: row.violations,
                safety_score: score,
                total_persons: row.total_persons,
            });
        }

        res.status(200).json(report);
    } catch (error) {
        console.error('getHourlyReport error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching hourly report',
            error: error.message,
        });
    }
};

exports.getDateRangeReport = async (req, res) => {
    try {
        const startStr = req.query.start;
        const endStr = req.query.end;

        if (!startStr || !endStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
            return res.status(400).json({
                success: false,
                message: 'start and end are required in YYYY-MM-DD format',
            });
        }

        const tz = getLocalTimezoneOffset();

        const rows = await Inference.aggregate([
            {
                $match: {
                    source_type: { $in: LIVE_SOURCE_TYPES },
                    $expr: {
                        $and: [
                            { $gte: [{ $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: tz } }, startStr] },
                            { $lte: [{ $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: tz } }, endStr] }
                        ]
                    }
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: tz } },
                    violations: { $sum: '$total_violations' },
                    total_persons: { $sum: '$total_persons' },
                    windowRecords: {
                        $push: {
                            persons: '$total_persons',
                            violations: '$total_violations'
                        }
                    }
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const report = rows.map((r) => {
            const score = computeSafetyScore(r.windowRecords);
            return {
                date: r._id,
                violations: r.violations,
                safety_score: score,
                compliance_score: score,
                total_persons: r.total_persons,
            };
        });

        res.status(200).json(report);
    } catch (error) {
        console.error('getDateRangeReport error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching date range report',
            error: error.message,
        });
    }
};

exports.exportCSV = async (req, res) => {
    try {
        const startStr = req.query.start;
        const endStr = req.query.end;

        if (!startStr || !endStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
            return res.status(400).json({
                success: false,
                message: 'start and end are required in YYYY-MM-DD format',
            });
        }

        const tz = getLocalTimezoneOffset();

        const rows = await Violation.aggregate([
            {
                $lookup: {
                    from: 'inferences',
                    localField: 'inference_id',
                    foreignField: 'inference_id',
                    as: 'inference',
                },
            },
            { $unwind: '$inference' },
            {
                $match: {
                    'inference.source_type': { $in: LIVE_SOURCE_TYPES },
                    $expr: {
                        $and: [
                            { $gte: [{ $dateToString: { format: '%Y-%m-%d', date: '$inference.timestamp', timezone: tz } }, startStr] },
                            { $lte: [{ $dateToString: { format: '%Y-%m-%d', date: '$inference.timestamp', timezone: tz } }, endStr] }
                        ]
                    }
                },
            },
            {
                $project: {
                    _id: 0,
                    timestamp: '$inference.timestamp',
                    zone_id: '$inference.zone_id',
                    violation_type: '$violation_type',
                    confidence: '$confidence',
                    severity: '$severity',
                    inference_id: '$inference_id',
                },
            },
            { $sort: { timestamp: 1 } },
        ]);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="inference_violations.csv"');

        const header = 'timestamp,zone_id,violation_type,confidence,severity,inference_id';
        res.write(`${header}\n`);

        for (const row of rows) {
            const line = [
                csvEscape(row.timestamp ? new Date(row.timestamp).toISOString() : ''),
                csvEscape(row.zone_id || ''),
                csvEscape(row.violation_type || ''),
                csvEscape(row.confidence ?? ''),
                csvEscape(row.severity || ''),
                csvEscape(row.inference_id || ''),
            ].join(',');

            res.write(`${line}\n`);
        }

        res.end();
    } catch (error) {
        console.error('exportCSV error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting CSV',
            error: error.message,
        });
    }
};
