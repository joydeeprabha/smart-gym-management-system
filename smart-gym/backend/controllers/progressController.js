// ============================================================
// controllers/progressController.js
// BMI calculation and body progress tracking
// ============================================================

const db = require('../config/db');

// Helper: Calculate BMI
function calculateBMI(heightCm, weightKg) {
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return parseFloat(bmi.toFixed(2));
}

// Helper: Get BMI category
function getBMICategory(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25.0) return 'Normal weight';
    if (bmi < 30.0) return 'Overweight';
    return 'Obese';
}

// ---- POST /api/progress ----
// Add a new progress entry (calculates BMI automatically)
exports.addProgress = async (req, res) => {
    try {
        const { memberId, height, weight, notes } = req.body;

        // Members can only add their own progress
        let resolvedMemberId = memberId;
        if (req.user.role === 'member') {
            const [member] = await db.query('SELECT id FROM members WHERE user_id = ?', [req.user.id]);
            if (member.length === 0) {
                return res.status(404).json({ success: false, message: 'Member profile not found.' });
            }
            resolvedMemberId = member[0].id;
        }

        if (!height || !weight) {
            return res.status(400).json({ success: false, message: 'Height and weight are required.' });
        }

        const bmi = calculateBMI(parseFloat(height), parseFloat(weight));
        const date = new Date().toISOString().split('T')[0];

        const [result] = await db.query(
            'INSERT INTO progress (member_id, height, weight, bmi, date, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [resolvedMemberId, height, weight, bmi, date, notes || '']
        );

        res.status(201).json({
            success: true,
            message: 'Progress recorded.',
            data: {
                id: result.insertId,
                bmi,
                category: getBMICategory(bmi)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to add progress.' });
    }
};

// ---- GET /api/progress ----
// Get all progress (Admin) or own (Member)
exports.getProgress = async (req, res) => {
    try {
        let rows;

        if (req.user.role === 'admin') {
            [rows] = await db.query(`
                SELECT p.*, u.name, m.id as member_id
                FROM progress p
                JOIN members m ON p.member_id = m.id
                JOIN users u ON m.user_id = u.id
                ORDER BY p.date DESC
            `);
        } else {
            const [member] = await db.query('SELECT id FROM members WHERE user_id = ?', [req.user.id]);
            if (member.length === 0) return res.json({ success: true, data: [] });

            [rows] = await db.query(
                'SELECT * FROM progress WHERE member_id = ? ORDER BY date ASC',
                [member[0].id]
            );
        }

        // Add BMI category to each record
        rows = rows.map(r => ({ ...r, category: getBMICategory(r.bmi) }));
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch progress.' });
    }
};

// ---- GET /api/progress/member/:memberId ----
// Get progress for specific member (Admin)
exports.getMemberProgress = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM progress WHERE member_id = ? ORDER BY date ASC',
            [req.params.memberId]
        );
        const enriched = rows.map(r => ({ ...r, category: getBMICategory(r.bmi) }));
        res.json({ success: true, data: enriched });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch progress.' });
    }
};
