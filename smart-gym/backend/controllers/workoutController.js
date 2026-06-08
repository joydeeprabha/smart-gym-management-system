// ============================================================
// controllers/workoutController.js
// Admin assigns workout plans; members can view
// ============================================================

const db = require('../config/db');

// ---- GET /api/workouts ----
// Get all workout plans (Admin) or own (Member)
exports.getWorkouts = async (req, res) => {
    try {
        let rows;

        if (req.user.role === 'admin') {
            [rows] = await db.query(`
                SELECT w.*, u.name as member_name, u.email,
                       a.name as assigned_by_name
                FROM workouts w
                JOIN members m ON w.member_id = m.id
                JOIN users u ON m.user_id = u.id
                LEFT JOIN users a ON w.assigned_by = a.id
                ORDER BY w.assigned_date DESC
            `);
        } else {
            const [member] = await db.query('SELECT id FROM members WHERE user_id = ?', [req.user.id]);
            if (member.length === 0) return res.json({ success: true, data: [] });

            [rows] = await db.query(
                'SELECT * FROM workouts WHERE member_id = ? ORDER BY assigned_date DESC',
                [member[0].id]
            );
        }

        // Parse JSON plan_details if stored as JSON string
        rows = rows.map(r => {
            try {
                r.plan_details = typeof r.plan_details === 'string'
                    ? JSON.parse(r.plan_details)
                    : r.plan_details;
            } catch (e) { /* keep as string */ }
            return r;
        });

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch workouts.' });
    }
};

// ---- POST /api/workouts ----
// Assign a new workout plan (Admin)
exports.assignWorkout = async (req, res) => {
    try {
        const { memberId, planName, planDetails } = req.body;

        if (!memberId || !planName || !planDetails) {
            return res.status(400).json({ success: false, message: 'Member ID, plan name, and details are required.' });
        }

        const assignedDate = new Date().toISOString().split('T')[0];
        const detailsStr = typeof planDetails === 'object'
            ? JSON.stringify(planDetails)
            : planDetails;

        const [result] = await db.query(
            'INSERT INTO workouts (member_id, plan_name, plan_details, assigned_date, assigned_by) VALUES (?, ?, ?, ?, ?)',
            [memberId, planName, detailsStr, assignedDate, req.user.id]
        );

        res.status(201).json({
            success: true,
            message: 'Workout plan assigned.',
            workoutId: result.insertId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to assign workout.' });
    }
};

// ---- PUT /api/workouts/:id ----
// Update workout plan
exports.updateWorkout = async (req, res) => {
    try {
        const { id } = req.params;
        const { planName, planDetails } = req.body;

        const detailsStr = typeof planDetails === 'object'
            ? JSON.stringify(planDetails)
            : planDetails;

        await db.query(
            'UPDATE workouts SET plan_name = ?, plan_details = ? WHERE id = ?',
            [planName, detailsStr, id]
        );
        res.json({ success: true, message: 'Workout updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update workout.' });
    }
};

// ---- DELETE /api/workouts/:id ----
exports.deleteWorkout = async (req, res) => {
    try {
        await db.query('DELETE FROM workouts WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Workout deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete workout.' });
    }
};
