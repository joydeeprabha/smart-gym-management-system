// ============================================================
// controllers/attendanceController.js
// QR-based attendance marking and viewing
// ============================================================

const db = require('../config/db');

// ---- POST /api/attendance/mark ----
// Mark attendance via QR code scan (sends memberId)
exports.markAttendance = async (req, res) => {
    try {
        const { memberId } = req.body;

        if (!memberId) {
            return res.status(400).json({ success: false, message: 'Member ID is required.' });
        }

        // Verify member exists
        const [members] = await db.query('SELECT id FROM members WHERE id = ?', [memberId]);
        if (members.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        const today = new Date().toISOString().split('T')[0];

        // Check if already marked today (prevent duplicate)
        const [existing] = await db.query(
            'SELECT id FROM attendance WHERE member_id = ? AND date = ?',
            [memberId, today]
        );

        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Attendance already marked for today.' });
        }

        // Insert attendance record
        await db.query(
            'INSERT INTO attendance (member_id, date, status) VALUES (?, ?, ?)',
            [memberId, today, 'present']
        );

        // Get member name for confirmation
        const [memberInfo] = await db.query(
            'SELECT u.name FROM members m JOIN users u ON m.user_id = u.id WHERE m.id = ?',
            [memberId]
        );

        res.json({
            success: true,
            message: `Attendance marked for ${memberInfo[0]?.name || 'member'} on ${today}`
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to mark attendance.' });
    }
};

// ---- GET /api/attendance ----
// Get all attendance records (Admin) or own records (Member)
exports.getAttendance = async (req, res) => {
    try {
        let query, params = [];

        if (req.user.role === 'admin') {
            // Admin sees all records
            query = `
                SELECT a.id, a.date, a.status, a.check_in_time,
                       m.id as member_id, u.name, u.email
                FROM attendance a
                JOIN members m ON a.member_id = m.id
                JOIN users u ON m.user_id = u.id
                ORDER BY a.date DESC, a.check_in_time DESC
                LIMIT 100
            `;
        } else {
            // Member sees own records only
            const [member] = await db.query('SELECT id FROM members WHERE user_id = ?', [req.user.id]);
            if (member.length === 0) return res.json({ success: true, data: [] });

            query = `
                SELECT a.id, a.date, a.status, a.check_in_time
                FROM attendance a
                WHERE a.member_id = ?
                ORDER BY a.date DESC
            `;
            params = [member[0].id];
        }

        const [records] = await db.query(query, params);
        res.json({ success: true, data: records });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance.' });
    }
};

// ---- GET /api/attendance/today ----
// Get today's attendance count (Admin dashboard)
exports.getTodayAttendance = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [rows] = await db.query(`
            SELECT COUNT(*) as count,
                   GROUP_CONCAT(u.name ORDER BY a.check_in_time) as members
            FROM attendance a
            JOIN members m ON a.member_id = m.id
            JOIN users u ON m.user_id = u.id
            WHERE a.date = ?
        `, [today]);

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch today\'s attendance.' });
    }
};

// ---- GET /api/attendance/member/:memberId ----
// Get attendance for a specific member
exports.getMemberAttendance = async (req, res) => {
    try {
        const { memberId } = req.params;
        const [records] = await db.query(
            'SELECT * FROM attendance WHERE member_id = ? ORDER BY date DESC',
            [memberId]
        );
        res.json({ success: true, data: records });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance.' });
    }
};
